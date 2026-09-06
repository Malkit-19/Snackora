const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');

const isUserApprovedB2B = (user) => {
  if (!user) return false;
  if (user.role === USER_ROLES.ADMIN) return true;
  return (
    user.role === USER_ROLES.B2B_WHOLESALER &&
    (user.b2bStatus === B2B_STATUS.APPROVED || user.b2bProfile?.verificationStatus === B2B_STATUS.APPROVED)
  );
};

/**
 * Authoritative checkout totals calculation.
 * Always fetches live product prices from DB.
 * Frontend prices are completely ignored.
 *
 * @returns {Object} { valid, items, pricing, couponInfo, errors }
 */
const calculateCheckoutTotals = async (user, cartId = null) => {
  const isB2B = isUserApprovedB2B(user);

  // Fetch user's cart
  const cart = await Cart.findOne({ user: user._id });
  if (!cart || cart.items.length === 0) {
    return { valid: false, errors: ['Cart is empty.'], items: [], pricing: null };
  }

  const errors = [];
  const lineItems = [];
  let subtotal = 0;

  for (const item of cart.items) {
    const product = await Product.findById(item.product);

    if (!product) {
      errors.push(`A product in your cart is no longer available (ID: ${item.product}).`);
      continue;
    }
    if (!product.isAvailable || product.stock < 1) {
      errors.push(`'${product.name}' is currently out of stock.`);
      continue;
    }
    if (item.quantity > product.stock) {
      errors.push(`Only ${product.stock} unit(s) of '${product.name}' are available. Please update your cart.`);
      continue;
    }

    const moq = isB2B ? (product.b2bMoq || product.moq || 1) : 1;
    if (isB2B && item.quantity < moq) {
      errors.push(`Minimum order quantity for '${product.name}' under wholesale pricing is ${moq} units.`);
      continue;
    }

    // Authoritative server-side price (NEVER trust frontend)
    const unitPrice = isB2B
      ? (product.wholesalePrice || product.b2bPrice || product.retailPrice)
      : (product.retailDiscountPrice || product.retailPrice);

    const itemTotal = unitPrice * item.quantity;
    subtotal += itemTotal;

    lineItems.push({
      product: product._id,
      name: product.name,
      sku: product.sku,
      image: product.images?.[0]?.url || '',
      slug: product.slug || '',
      category: (product.category?.name || product.category || ''),
      unit: product.unit || product.weight || '',
      unitPrice,
      mrp: product.mrp || product.retailPrice,
      quantity: item.quantity,
      isWholesale: isB2B,
      moq: isB2B ? (product.b2bMoq || product.moq || 1) : 1,
      itemDiscount: 0,
      total: itemTotal,
      stock: product.stock
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors, items: lineItems, pricing: null };
  }

  // Coupon discount (server-validated)
  let discount = 0;
  let couponInfo = null;
  if (cart.coupon) {
    const coupon = await Coupon.findById(cart.coupon);
    if (coupon && coupon.isActive && new Date() <= new Date(coupon.endDate) && subtotal >= coupon.minOrderAmount) {
      if (coupon.discountType === 'PERCENTAGE') {
        discount = (subtotal * coupon.discountValue) / 100;
        if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
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

  // Delivery fee: 100% Free Delivery for first 3 orders for any user (Customer or B2B)
  const Order = require('../models/Order');
  const pastOrdersCount = user?._id
    ? await Order.countDocuments({ user: user._id, orderStatus: { $ne: 'CANCELLED' } })
    : 0;
  const isFirst3Orders = user?._id ? pastOrdersCount < 3 : false;

  const freeDeliveryThreshold = isB2B ? 2000 : 499;
  const deliveryFee = (isFirst3Orders || (subtotal > 0 && subtotal >= freeDeliveryThreshold)) ? 0 : 49;

  // 5% GST on taxable amount
  const taxableAmount = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxableAmount * 0.05);

  const total = Math.round(taxableAmount + tax + deliveryFee);

  return {
    valid: true,
    errors: [],
    items: lineItems,
    isB2B,
    pricing: {
      subtotal: Math.round(subtotal),
      discount: Math.round(discount),
      delivery: deliveryFee,
      deliveryCharge: deliveryFee,
      tax,
      total,
      isFirst3OrdersFreeDelivery: isFirst3Orders,
      freeDeliveryOrdersRemaining: user?._id ? Math.max(3 - pastOrdersCount, 0) : 3,
      pastOrdersCount
    },
    couponInfo
  };

};

/**
 * Generate a unique human-readable order number
 */
const generateOrderNumber = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `SNK-${year}${month}${day}-${rand}`;
};

module.exports = {
  isUserApprovedB2B,
  calculateCheckoutTotals,
  generateOrderNumber
};
