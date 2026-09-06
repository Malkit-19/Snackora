const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Payment = require('../models/Payment');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { calculateCheckoutTotals, generateOrderNumber } = require('../services/checkoutService');
const { PAYMENT_METHODS } = require('../config/constants');
const { createInAppNotification } = require('../controllers/notificationController');
const { sendOrderConfirmationEmail } = require('../services/emailService');

const ALLOWED_PAYMENT_METHODS = [
  PAYMENT_METHODS.COD,
  PAYMENT_METHODS.UPI,
  PAYMENT_METHODS.CARD
];

/**
 * GET /api/checkout/summary
 * Preview authoritative order totals for the user's current cart (before placing).
 * Frontend totals are IGNORED — backend recalculates from live DB.
 */
const getCheckoutSummary = async (req, res, next) => {
  try {
    const result = await calculateCheckoutTotals(req.user);

    if (!result.valid) {
      return sendError(
        res,
        result.errors.join(' '),
        400,
        'CART_VALIDATION_ERROR',
        { errors: result.errors }
      );
    }

    return sendSuccess(res, 'Checkout summary calculated.', {
      items: result.items,
      pricing: result.pricing,
      isB2BOrder: result.isB2B,
      coupon: result.couponInfo
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/checkout/place-order
 * Place an order. Server recalculates ALL pricing from live DB.
 * Never trusts any price/discount/total from the request body.
 *
 * Body:
 *   addressId     - ID of a saved address belonging to the user
 *   paymentMethod - 'COD' | 'UPI'
 *   notes         - optional order notes
 */
const placeOrder = async (req, res, next) => {
  try {
    const { addressId, paymentMethod, notes, idempotencyKey: bodyIdempotencyKey } = req.body;
    const idempotencyKey = req.headers['x-idempotency-key'] || bodyIdempotencyKey;

    // 0. Idempotency Check: Prevent duplicate orders
    if (idempotencyKey) {
      const existingOrder = await Order.findOne({ idempotencyKey, user: req.user._id });
      if (existingOrder) {
        return sendSuccess(res, 'Order already placed (idempotent).', {
          order: existingOrder,
          isDuplicate: true
        }, 200);
      }
    }

    // 0.1 B2B Verification Check: Pending B2B accounts can build carts but cannot checkout until approved
    if (req.user.role === 'B2B_WHOLESALER') {
      const isApproved = req.user.b2bStatus === 'APPROVED' || req.user.b2bProfile?.verificationStatus === 'APPROVED';
      if (!isApproved) {
        return sendError(
          res,
          'Your B2B Wholesale account is pending admin verification. You can browse and add items to your cart, but order placement is locked until your business credentials are confirmed.',
          403,
          'B2B_VERIFICATION_PENDING'
        );
      }
    }


    // 1. Validate addressId
    if (!addressId) {
      return sendError(res, 'A delivery address is required to place an order.', 400, 'VALIDATION_ERROR');
    }

    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
      return sendError(res, 'Selected delivery address not found.', 404, 'NOT_FOUND');
    }

    // 2. Validate payment method
    if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return sendError(
        res,
        `Invalid payment method. Supported methods are: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // 3. Authoritative server-side pricing (NEVER trust frontend totals)
    const checkout = await calculateCheckoutTotals(req.user);
    if (!checkout.valid) {
      return sendError(
        res,
        checkout.errors.join(' '),
        400,
        'CART_VALIDATION_ERROR',
        { errors: checkout.errors }
      );
    }

    // 4. Build IMMUTABLE address snapshot (frozen copy — editing the address later won't affect this order)
    const addressSnapshot = {
      addressId: address._id,         // reference for traceability only
      fullName: address.fullName || address.name,
      name: address.fullName || address.name,
      phone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2 || '',
      city: address.city,
      state: address.state,
      pincode: address.pincode || address.postalCode,
      postalCode: address.pincode || address.postalCode,
      country: address.country || 'India',
      label: address.label || 'Home'
    };

    // 5. Build immutable order item snapshots — frozen at purchase time
    const orderItems = checkout.items.map((item) => ({
      product: item.product,
      name: item.name,
      sku: item.sku,
      image: item.image,
      slug: item.slug || '',
      category: item.category || '',
      unit: item.unit || '',
      price: item.unitPrice,
      mrp: item.mrp || item.unitPrice,
      quantity: item.quantity,
      itemDiscount: item.itemDiscount || 0,
      isWholesale: item.isWholesale,
      moq: item.moq || 1,
      total: item.total
    }));

    // 6. Create the order with initial PLACED status and status history
    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: req.user._id,
      isB2BOrder: checkout.isB2B,
      items: orderItems,
      shippingAddress: addressSnapshot,
      pricing: {
        subtotal: checkout.pricing.subtotal,
        discount: checkout.pricing.discount,
        tax: checkout.pricing.tax,
        shippingFee: checkout.pricing.delivery,
        total: checkout.pricing.total
      },
      couponApplied: checkout.couponInfo
        ? { code: checkout.couponInfo.code, discountAmount: checkout.couponInfo.discountAmount }
        : undefined,
      paymentMethod,
      paymentStatus: 'PENDING',
      orderStatus: 'PLACED',
      idempotencyKey: idempotencyKey || undefined,
      statusHistory: [{
        status: 'PLACED',
        changedBy: req.user._id,
        changedByRole: req.user.role,
        note: `Order placed by customer via ${paymentMethod}.`,
        timestamp: new Date()
      }],
      notes: notes || ''
    });

    // 7. Create Payment record for tracking
    const paymentAmount = ['CARD', 'UPI'].includes(paymentMethod)
      ? Math.round(checkout.pricing.total * 100)
      : checkout.pricing.total;

    const payment = await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      user: req.user._id,
      method: paymentMethod,
      amount: paymentAmount,
      currency: 'INR',
      status: 'PENDING'
    });

    order.paymentId = payment._id;
    await order.save();

    // 8. Clear the cart after successful order creation
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], coupon: null, lastActivityAt: new Date() } }
    );

    // 9. Dispatch in-app notification & confirmation email (non-blocking)
    createInAppNotification({
      userId: req.user._id,
      type: 'ORDER',
      title: `Order Placed: ${order.orderNumber}`,
      message: `Your order for ₹${order.pricing.total} has been placed successfully via ${paymentMethod}.`,
      link: `/orders/${order._id}`,
      metadata: { orderId: order._id, orderNumber: order.orderNumber }
    }).catch((e) => console.warn('[Notification Error]', e.message));

    sendOrderConfirmationEmail({
      user: req.user,
      order
    }).catch((e) => console.warn('[Email Error]', e.message));

    return sendSuccess(res, 'Order placed successfully!', {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        shippingAddress: order.shippingAddress,
        pricing: order.pricing,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        paymentId: payment._id,
        isB2BOrder: order.isB2BOrder,
        createdAt: order.createdAt
      }
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/checkout/orders
 * Get authenticated user's order history
 */
const getMyOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      Order.find({ user: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Order.countDocuments({ user: req.user._id })
    ]);

    return sendSuccess(res, 'Orders retrieved successfully.', {
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalOrders: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/checkout/orders/:orderNumber
 * Get a specific order by orderNumber (user must own it)
 */
const getOrderByNumber = async (req, res, next) => {
  try {
    const { orderNumber } = req.params;
    const order = await Order.findOne({
      orderNumber: orderNumber.toUpperCase(),
      user: req.user._id
    }).select('-__v');

    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Order retrieved successfully.', { order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCheckoutSummary,
  placeOrder,
  getMyOrders,
  getOrderByNumber
};
