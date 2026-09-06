const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');

/**
 * Authoritative check: Only ADMIN or APPROVED B2B Wholesaler gets wholesale pricing
 */
const isUserApprovedB2B = (user) => {
  if (!user) return false;
  if (user.role === USER_ROLES.ADMIN) return true;
  return (
    user.role === USER_ROLES.B2B_WHOLESALER &&
    (user.b2bStatus === B2B_STATUS.APPROVED || user.b2bProfile?.verificationStatus === B2B_STATUS.APPROVED)
  );
};

/**
 * Calculates authoritative pricing, discounts, tax, and delivery for a cart
 */
const calculateCartTotals = async (cart, user) => {
  const isB2B = isUserApprovedB2B(user);
  let subtotal = 0;
  let totalItemsCount = 0;
  const processedItems = [];

  for (const item of cart.items) {
    const product = await Product.findById(item.product).populate('category', 'name slug');
    if (!product || !product.isAvailable) {
      continue; // Skip deactivated or deleted products
    }

    // Determine authoritative unit price
    let unitPrice;
    if (isB2B) {
      unitPrice = product.wholesalePrice || product.b2bPrice || product.retailPrice;
    } else {
      unitPrice = product.retailDiscountPrice || product.retailPrice;
    }

    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;
    totalItemsCount += item.quantity;

    processedItems.push({
      _id: item._id,
      product: {
        _id: product._id,
        name: product.name,
        slug: product.slug,
        sku: product.sku,
        images: product.images,
        unit: product.unit || product.weight,
        stock: product.stock,
        retailPrice: product.retailPrice,
        retailDiscountPrice: product.retailDiscountPrice,
        wholesalePrice: isB2B ? (product.wholesalePrice || product.b2bPrice) : undefined,
        b2bMoq: isB2B ? (product.b2bMoq || product.moq) : undefined,
        category: product.category
      },
      quantity: item.quantity,
      unitPrice,
      total: itemTotal,
      isWholesale: isB2B,
      addedAt: item.addedAt
    });
  }

  // Calculate discount if coupon attached
  let discount = 0;
  let couponInfo = null;
  if (cart.coupon) {
    const coupon = await Coupon.findById(cart.coupon);
    if (coupon && coupon.isActive && new Date() <= new Date(coupon.endDate) && subtotal >= coupon.minOrderAmount) {
      if (coupon.discountType === 'PERCENTAGE') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount) {
          discount = Math.min(discount, coupon.maxDiscountAmount);
        }
      } else {
        discount = Math.min(coupon.discountValue, subtotal);
      }
      couponInfo = {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Math.round(discount)
      };
    }
  }

  // First 3 orders get 100% Free Delivery for all users (Customer & B2B)
  const Order = require('../models/Order');
  const pastOrdersCount = user?._id
    ? await Order.countDocuments({ user: user._id, orderStatus: { $ne: 'CANCELLED' } })
    : 0;
  const isFirst3Orders = user?._id ? pastOrdersCount < 3 : false;

  // Delivery fee rule: Free delivery for first 3 orders, OR orders >= ₹499 (or B2B bulk orders >= ₹2000), else ₹49
  const freeDeliveryThreshold = isB2B ? 2000 : 499;
  const qualifiesThreshold = subtotal > 0 && subtotal >= freeDeliveryThreshold;
  const qualifiesForFreeDelivery = isFirst3Orders || qualifiesThreshold;
  const deliveryFee = qualifiesForFreeDelivery ? 0 : (subtotal > 0 ? 49 : 0);

  // 5% standard GST on subtotal after discount
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxableAmount * 0.05);

  const total = Math.max(taxableAmount + tax + deliveryFee, 0);

  return {
    items: processedItems,
    summary: {
      itemsCount: totalItemsCount,
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      delivery: deliveryFee,
      tax,
      total: Math.round(total),
      isWholesaleView: isB2B,
      freeDeliveryThreshold,
      qualifiesForFreeDelivery,
      isFirst3OrdersFreeDelivery: isFirst3Orders,
      freeDeliveryOrdersRemaining: user?._id ? Math.max(3 - pastOrdersCount, 0) : 3,
      pastOrdersCount,
      coupon: couponInfo
    }
  };

};

/**
 * Get or create cart for user
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
  }
  return cart;
};

module.exports = {
  isUserApprovedB2B,
  calculateCartTotals,
  getOrCreateCart
};
