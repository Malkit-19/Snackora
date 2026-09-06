const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { calculateCartTotals, getOrCreateCart, isUserApprovedB2B } = require('../services/cartService');

/**
 * GET /api/cart & /api/v1/cart
 * Fetch current user's cart with live authoritative calculations
 */
const getCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    const calculated = await calculateCartTotals(cart, req.user);

    return sendSuccess(res, 'Cart retrieved successfully.', {
      cart: {
        _id: cart._id,
        user: req.user._id,
        items: calculated.items,
        summary: calculated.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/cart/items & /api/v1/cart/items
 * Add an item to cart with authoritative validation
 */
const addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return sendError(res, 'productId is required.', 400, 'VALIDATION_ERROR');
    }

    const requestedQty = parseInt(quantity, 10);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      return sendError(res, 'Quantity must be a positive number greater than 0.', 400, 'VALIDATION_ERROR');
    }

    // 1. Verify Product Exists and is Active
    let product;
    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId);
    }
    if (!product) {
      product = await Product.findOne({ slug: String(productId).toLowerCase().trim() });
    }

    if (!product || !product.isAvailable) {
      return sendError(res, 'Product is unavailable or does not exist.', 404, 'NOT_FOUND');
    }

    const isB2B = isUserApprovedB2B(req.user);
    const moq = isB2B ? (product.b2bMoq || product.moq || 1) : 1;

    // 2. Validate B2B MOQ floor
    if (isB2B && requestedQty < moq) {
      return sendError(
        res,
        `Minimum order quantity for wholesale pricing on '${product.name}' is ${moq} units.`,
        400,
        'MOQ_VIOLATION',
        { moq, requestedQty }
      );
    }

    // 3. Validate Stock
    if (product.stock <= 0) {
      return sendError(res, `'${product.name}' is currently out of stock.`, 400, 'OUT_OF_STOCK');
    }

    const cart = await getOrCreateCart(req.user._id);
    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === product._id.toString()
    );

    const effectiveUnitPrice = isB2B
      ? (product.wholesalePrice || product.b2bPrice || product.retailPrice)
      : (product.retailDiscountPrice || product.retailPrice);

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + requestedQty;
      if (newQty > product.stock) {
        return sendError(
          res,
          `Cannot add ${requestedQty} more. Total in cart (${newQty}) exceeds available stock (${product.stock}).`,
          400,
          'INSUFFICIENT_STOCK',
          { availableStock: product.stock, currentInCart: cart.items[existingIndex].quantity }
        );
      }
      cart.items[existingIndex].quantity = newQty;
      cart.items[existingIndex].priceAtAddition = effectiveUnitPrice;
      cart.items[existingIndex].isWholesale = isB2B;
    } else {
      if (requestedQty > product.stock) {
        return sendError(
          res,
          `Requested quantity (${requestedQty}) exceeds available stock (${product.stock}).`,
          400,
          'INSUFFICIENT_STOCK',
          { availableStock: product.stock }
        );
      }
      cart.items.push({
        product: product._id,
        quantity: requestedQty,
        priceAtAddition: effectiveUnitPrice,
        isWholesale: isB2B,
        addedAt: new Date()
      });
    }

    cart.lastActivityAt = new Date();
    await cart.save();

    const calculated = await calculateCartTotals(cart, req.user);

    return sendSuccess(res, `Added ${requestedQty}× '${product.name}' to cart.`, {
      cart: {
        _id: cart._id,
        items: calculated.items,
        summary: calculated.summary
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/cart/items/:id & /api/v1/cart/items/:id
 * Update quantity for a specific item in cart
 */
const updateCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined || isNaN(Number(quantity))) {
      return sendError(res, 'A valid numeric quantity is required.', 400, 'VALIDATION_ERROR');
    }

    const newQty = parseInt(quantity, 10);
    const cart = await getOrCreateCart(req.user._id);

    // Find item by cart subdocument _id OR product _id
    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === id || item.product.toString() === id
    );

    if (itemIndex === -1) {
      return sendError(res, 'Item not found in your cart.', 404, 'NOT_FOUND');
    }

    // If quantity is 0 or negative -> remove item
    if (newQty <= 0) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      const calculated = await calculateCartTotals(cart, req.user);
      return sendSuccess(res, 'Item removed from cart.', {
        cart: {
          _id: cart._id,
          items: calculated.items,
          summary: calculated.summary
        }
      });
    }

    // Verify stock and MOQ
    const product = await Product.findById(cart.items[itemIndex].product);
    if (!product || !product.isAvailable) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      return sendError(res, 'This product is no longer available and was removed from your cart.', 404, 'PRODUCT_UNAVAILABLE');
    }

    const isB2B = isUserApprovedB2B(req.user);
    const moq = isB2B ? (product.b2bMoq || product.moq || 1) : 1;

    if (isB2B && newQty < moq) {
      return sendError(
        res,
        `Minimum order quantity for '${product.name}' under wholesale pricing is ${moq} units.`,
        400,
        'MOQ_VIOLATION',
        { moq, requestedQty: newQty }
      );
    }

    if (newQty > product.stock) {
      return sendError(
        res,
        `Cannot set quantity to ${newQty}. Only ${product.stock} units available in stock.`,
        400,
        'INSUFFICIENT_STOCK',
        { availableStock: product.stock }
      );
    }

    cart.items[itemIndex].quantity = newQty;
    cart.lastActivityAt = new Date();
    await cart.save();

    const calculated = await calculateCartTotals(cart, req.user);

    return sendSuccess(res, 'Cart quantity updated.', {
      cart: {
        _id: cart._id,
        items: calculated.items,
        summary: calculated.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/cart/items/:id & /api/v1/cart/items/:id
 * Remove a specific item from cart
 */
const removeCartItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cart = await getOrCreateCart(req.user._id);

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === id || item.product.toString() === id
    );

    if (itemIndex === -1) {
      return sendError(res, 'Item not found in your cart.', 404, 'NOT_FOUND');
    }

    cart.items.splice(itemIndex, 1);
    cart.lastActivityAt = new Date();
    await cart.save();

    const calculated = await calculateCartTotals(cart, req.user);

    return sendSuccess(res, 'Item removed from cart.', {
      cart: {
        _id: cart._id,
        items: calculated.items,
        summary: calculated.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/cart & /api/v1/cart
 * Empty entire cart
 */
const clearCart = async (req, res, next) => {
  try {
    const cart = await getOrCreateCart(req.user._id);
    cart.items = [];
    cart.coupon = null;
    cart.lastActivityAt = new Date();
    await cart.save();

    const calculated = await calculateCartTotals(cart, req.user);

    return sendSuccess(res, 'Cart cleared successfully.', {
      cart: {
        _id: cart._id,
        items: calculated.items,
        summary: calculated.summary
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
