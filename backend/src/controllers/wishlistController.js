const mongoose = require('mongoose');
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');

const isApprovedB2B = (user) => {
  if (!user) return false;
  if (user.role === USER_ROLES.ADMIN) return true;
  return (
    user.role === USER_ROLES.B2B_WHOLESALER &&
    (user.b2bStatus === B2B_STATUS.APPROVED || user.b2bProfile?.verificationStatus === B2B_STATUS.APPROVED)
  );
};

/**
 * GET /api/wishlist
 * Fetch authenticated user's wishlist with populated active products
 */
const getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'products',
        match: { isAvailable: true },
        populate: { path: 'category', select: 'name slug' }
      });

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    const canSeeWholesale = isApprovedB2B(req.user);
    const sanitizedProducts = (wishlist.products || []).map((p) =>
      typeof p.toRoleSpecificJSON === 'function' ? p.toRoleSpecificJSON(canSeeWholesale) : p
    );

    return sendSuccess(res, 'Wishlist retrieved successfully.', {
      wishlist: {
        _id: wishlist._id,
        user: wishlist.user,
        products: sanitizedProducts,
        totalItems: sanitizedProducts.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/wishlist/:productId
 * Add a product to user's wishlist (Prevents duplicates)
 */
const addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 'Valid productId is required.', 400, 'VALIDATION_ERROR');
    }

    // 1. Verify Product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isAvailable) {
      return sendError(res, 'Product not found or unavailable.', 404, 'NOT_FOUND');
    }

    // 2. Fetch or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: req.user._id, products: [] });
    }

    // 3. Prevent duplicates
    const alreadyInWishlist = wishlist.products.some(
      (pId) => pId.toString() === productId.toString()
    );

    if (alreadyInWishlist) {
      return sendSuccess(res, `'${product.name}' is already in your wishlist.`, {
        wishlist,
        alreadyInWishlist: true
      });
    }

    wishlist.products.push(product._id);
    await wishlist.save();

    return sendSuccess(res, `Added '${product.name}' to your wishlist.`, {
      wishlist,
      addedProductId: product._id
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/wishlist/:productId
 * Remove a product from user's wishlist
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return sendError(res, 'Valid productId is required.', 400, 'VALIDATION_ERROR');
    }

    const wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      return sendSuccess(res, 'Product removed from wishlist.', { totalItems: 0 });
    }

    wishlist.products = wishlist.products.filter(
      (pId) => pId.toString() !== productId.toString()
    );
    await wishlist.save();

    return sendSuccess(res, 'Product removed from your wishlist.', {
      wishlist,
      removedProductId: productId,
      totalItems: wishlist.products.length
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist
};
