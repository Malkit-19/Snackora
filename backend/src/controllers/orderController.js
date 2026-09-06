const mongoose = require('mongoose');
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Address = require('../models/Address');
const Product = require('../models/Product');
const InventoryTransaction = require('../models/InventoryTransaction');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { calculateCheckoutTotals, generateOrderNumber } = require('../services/checkoutService');
const { PAYMENT_METHODS } = require('../config/constants');
const { createInAppNotification } = require('../controllers/notificationController');
const { sendOrderConfirmationEmail, sendOrderShippedEmail, sendOrderDeliveredEmail } = require('../services/emailService');
const whatsappService = require('../services/whatsappService');

const ALLOWED_PAYMENT_METHODS = ['COD', 'UPI'];

// Valid statuses users can use in status flow (ordered)
const VALID_ADMIN_STATUSES = [
  'PLACED', 'CONFIRMED', 'PACKED',
  'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
];

// Statuses that cannot be moved backward
const TERMINAL_STATUSES = ['DELIVERED', 'CANCELLED', 'REFUNDED'];

/**
 * POST /api/orders
 * Place a new order.
 * Backend recalculates ALL pricing — never trusts frontend values.
 */
const createOrder = async (req, res, next) => {
  try {
    const { addressId, paymentMethod, notes } = req.body;

    // B2B Verification Check: Pending B2B accounts can build carts but cannot checkout until approved
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

    if (!addressId) {
      return sendError(res, 'A delivery address is required.', 400, 'VALIDATION_ERROR');
    }

    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
      return sendError(res, 'Selected delivery address not found.', 404, 'NOT_FOUND');
    }

    if (!paymentMethod || !ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
      return sendError(
        res,
        `Invalid payment method. Supported: ${ALLOWED_PAYMENT_METHODS.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Authoritative backend pricing — ignores any prices from frontend
    const checkout = await calculateCheckoutTotals(req.user);
    if (!checkout.valid) {
      return sendError(res, checkout.errors.join(' '), 400, 'CART_VALIDATION_ERROR', {
        errors: checkout.errors
      });
    }

    // Immutable address snapshot
    const addressSnapshot = {
      addressId: address._id,
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

    // Immutable item snapshots
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
      statusHistory: [{
        status: 'PLACED',
        changedBy: req.user._id,
        changedByRole: req.user.role,
        note: 'Order placed.',
        timestamp: new Date()
      }],
      notes: notes || ''
    });

    // ── Deduct stock for all purchased items & record inventory transactions ──
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        const prevStock = typeof product.stock === 'number' ? product.stock : 0;
        const newStock = Math.max(prevStock - item.quantity, 0);
        product.stock = newStock;
        await product.save();

        // 1. Record Inventory Transaction
        await InventoryTransaction.create({
          product: product._id,
          sku: product.sku,
          type: 'SALE',
          quantity: -item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          previousReserved: product.reservedStock || 0,
          newReserved: product.reservedStock || 0,
          reason: `Order placed #${order.orderNumber}`,
          reference: order.orderNumber,
          performedBy: req.user._id
        });

        // 2. Low Stock Alert (<= 10 units)
        const threshold = typeof product.lowStockThreshold === 'number' ? product.lowStockThreshold : 10;
        if (newStock <= threshold || newStock <= 10) {
          const admins = await User.find({ role: 'ADMIN', isActive: true }).select('_id');
          for (const admin of admins) {
            await Notification.create({
              user: admin._id,
              type: 'SYSTEM',
              title: `⚠️ Low Stock Alert: ${product.name}`,
              message: `Only ${newStock} unit(s) left in stock for "${product.name}" (SKU: ${product.sku}). Threshold is 10 units. Click to restock immediately.`,
              link: `/admin?tab=inventory`,
              metadata: {
                productId: product._id,
                sku: product.sku,
                productName: product.name,
                currentStock: newStock,
                lowStockThreshold: threshold,
                isLowStock: true
              }
            });
          }
        }
      }
    }

    // Clear cart after successful order
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: [], coupon: null, lastActivityAt: new Date() } }
    );

    // Dispatch in-app notification, email, and WhatsApp confirmation (non-blocking)
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

    whatsappService.sendOrderConfirmation(req.user, order)
      .catch((e) => console.warn('[WhatsApp Error]', e.message));

    return sendSuccess(res, 'Order placed successfully!', { order }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/orders
 * Get current user's order history.
 * Customers & B2B users can only see their own orders.
 */
const getMyOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;
    const { status } = req.query;

    const query = { user: req.user._id };
    if (status && VALID_ADMIN_STATUSES.includes(status.toUpperCase())) {
      query.orderStatus = status.toUpperCase();
    }

    const [orders, total] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-statusHistory -__v'),
      Order.countDocuments(query)
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
 * GET /api/orders/:id
 * Get a specific order by ID or orderNumber.
 * User can only retrieve their own order.
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Support lookup by MongoDB _id or orderNumber string
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = {
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { orderNumber: id.toUpperCase() }
      ],
      user: req.user._id  // ownership enforcement
    };

    const order = await Order.findOne(query).select('-__v');
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Order retrieved successfully.', { order });
  } catch (error) {
    next(error);
  }
};

// ── ADMIN CONTROLLERS ────────────────────────────────────────────────────────

/**
 * GET /api/admin/orders
 * Admin: list all orders across all users with filtering and pagination.
 */
const adminGetAllOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const {
      status, paymentStatus, paymentMethod,
      isB2B, search, from, to,
      sortBy = 'createdAt', sortOrder = 'desc'
    } = req.query;

    const query = {};

    if (status && VALID_ADMIN_STATUSES.includes(status.toUpperCase())) {
      query.orderStatus = status.toUpperCase();
    }
    if (paymentStatus) query.paymentStatus = paymentStatus.toUpperCase();
    if (paymentMethod) query.paymentMethod = paymentMethod.toUpperCase();
    if (isB2B !== undefined) query.isB2BOrder = isB2B === 'true';

    // Date range filter
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Search by orderNumber
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email role b2bStatus')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-statusHistory -__v'),
      Order.countDocuments(query)
    ]);

    // Aggregate order status counts for admin dashboard
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);
    const statusSummary = {};
    statusCounts.forEach(({ _id, count }) => { statusSummary[_id] = count; });

    return sendSuccess(res, 'Admin: orders retrieved.', {
      orders,
      statusSummary,
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
 * PATCH /api/admin/orders/:id/status
 * Admin only: update order status.
 * Users cannot change order status.
 */
const adminUpdateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, orderStatus, note, trackingNumber, carrier, estimatedDelivery } = req.body;

    const rawStatus = status || orderStatus;
    if (!rawStatus || !VALID_ADMIN_STATUSES.includes(String(rawStatus).toUpperCase())) {
      return sendError(
        res,
        `Invalid status. Allowed values: ${VALID_ADMIN_STATUSES.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const newStatus = String(rawStatus).toUpperCase();

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const order = await Order.findOne(
      isObjectId ? { _id: id } : { orderNumber: id.toUpperCase() }
    );

    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    const prevStatus = order.orderStatus;
    order.orderStatus = newStatus;

    // Push to immutable status history
    order.statusHistory.push({
      status: newStatus,
      changedBy: req.user._id,
      changedByRole: req.user.role,
      note: note || `Status updated from ${prevStatus} to ${newStatus}.`,
      timestamp: new Date()
    });

    // Shipping metadata
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (carrier) order.carrier = carrier;
    if (estimatedDelivery) order.estimatedDelivery = new Date(estimatedDelivery);

    // Auto-set timestamps
    if (newStatus === 'DELIVERED') order.deliveredAt = new Date();
    if (newStatus === 'CANCELLED') {
      order.cancelledAt = new Date();
      order.cancellationReason = note || 'Cancelled by admin.';

      // Restore product stock if not previously cancelled
      if (prevStatus !== 'CANCELLED' && Array.isArray(order.items)) {
        for (const item of order.items) {
          if (item.product) {
            const product = await Product.findById(item.product);
            if (product) {
              const prevStock = typeof product.stock === 'number' ? product.stock : 0;
              const newStock = prevStock + (item.quantity || 1);
              product.stock = newStock;
              await product.save();

              await InventoryTransaction.create({
                product: product._id,
                sku: product.sku,
                type: 'ORDER_CANCELLED',
                quantity: item.quantity || 1,
                previousStock: prevStock,
                newStock: newStock,
                previousReserved: product.reservedStock || 0,
                newReserved: product.reservedStock || 0,
                reason: `Order cancelled #${order.orderNumber}`,
                reference: order.orderNumber,
                performedBy: req.user._id
              });
            }
          }
        }
      }
    }

    await order.save();

    // Dispatch customer notifications (in-app, email, and WhatsApp)
    (async () => {
      try {
        const orderUser = await User.findById(order.user).select('name email phone whatsappOptIn');
        if (orderUser) {
          await createInAppNotification({
            userId: orderUser._id,
            type: 'ORDER',
            title: `Order Update: #${order.orderNumber}`,
            message: `Your order status has been updated to ${newStatus}.`,
            link: `/orders/${order._id}`,
            metadata: { orderId: order._id, orderNumber: order.orderNumber, status: newStatus }
          });

          if (newStatus === 'SHIPPED') {
            await sendOrderShippedEmail({ user: orderUser, order });
          } else if (newStatus === 'DELIVERED') {
            await sendOrderDeliveredEmail({ user: orderUser, order });
          }

          await whatsappService.sendOrderStatusUpdate({
            user: orderUser,
            order,
            newStatus,
            trackingNumber: order.trackingNumber,
            carrier: order.carrier
          });
        }
      } catch (notifErr) {
        console.warn('[Status Notification Error]:', notifErr.message);
      }
    })();

    return sendSuccess(res, `Order status updated to ${newStatus}.`, {
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
        cancelledAt: order.cancelledAt,
        statusHistory: order.statusHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/admin/orders/:id
 * Admin: get full detail of any single order.
 */
const adminGetOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const order = await Order.findOne(
      isObjectId ? { _id: id } : { orderNumber: id.toUpperCase() }
    )
      .populate('user', 'name email phone role b2bStatus')
      .select('-__v');

    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Order retrieved.', { order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  adminGetAllOrders,
  adminUpdateOrderStatus,
  adminGetOrderById
};
