const mongoose = require('mongoose');
const Refund = require('../models/Refund');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const User = require('../models/User');
const InventoryTransaction = require('../models/InventoryTransaction');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');
const { createInAppNotification } = require('./notificationController');
const { sendRefundUpdateEmail } = require('../services/emailService');
const whatsappService = require('../services/whatsappService');
const smsService = require('../services/smsService');
const upiPayoutService = require('../services/upiPayoutService');
const { getRazorpay, isRazorpayConfigured } = require('../config/razorpay');

const VALID_REASONS = [
  'Damaged',
  'Wrong Product',
  'Missing Product',
  'Quality Issue',
  'Other'
];

const VALID_STATUSES = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'REFUND_INITIATED',
  'REFUNDED'
];

/**
 * Customer: POST /api/refunds
 * Request a refund for an order they own (with Bank Details, UPI ID, and WhatsApp Number)
 */
const createRefundRequest = async (req, res, next) => {
  try {
    const {
      orderId,
      reason,
      description,
      images = [],
      payoutPreference = 'UPI',
      upiId = '',
      whatsappNumber = '',
      bankDetails = {}
    } = req.body;

    if (!orderId) {
      return sendError(res, 'orderId is required.', 400, 'VALIDATION_ERROR');
    }
    if (!reason || !VALID_REASONS.includes(reason)) {
      return sendError(
        res,
        `Invalid reason. Allowed reasons: ${VALID_REASONS.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }
    if (!description || !description.trim()) {
      return sendError(res, 'Detailed description of the refund issue is required.', 400, 'VALIDATION_ERROR');
    }

    // ── WhatsApp Number Validation ───────────────────────────────────────────
    const cleanWhatsApp = String(whatsappNumber || req.user.phone || '').replace(/\D/g, '');
    const finalWhatsApp = cleanWhatsApp.startsWith('91') && cleanWhatsApp.length === 12
      ? cleanWhatsApp.slice(2)
      : cleanWhatsApp;

    if (!finalWhatsApp || finalWhatsApp.length !== 10) {
      return sendError(
        res,
        'A valid 10-digit WhatsApp mobile number is required to receive real-time refund notifications.',
        400,
        'VALIDATION_ERROR'
      );
    }

    // ── Payout Preference & Banking Validation ────────────────────────────────
    const cleanPref = payoutPreference === 'BANK_TRANSFER' ? 'BANK_TRANSFER' : 'UPI';
    const cleanUpiId = String(upiId || '').trim();

    if (cleanPref === 'UPI') {
      if (!cleanUpiId || !cleanUpiId.includes('@')) {
        return sendError(
          res,
          'A valid UPI ID (e.g., yourname@oksbi or 9876543210@paytm) is required for instant UPI refund.',
          400,
          'VALIDATION_ERROR'
        );
      }
    } else {
      // Bank Transfer validation
      if (!bankDetails?.accountNumber || !bankDetails?.ifscCode || !bankDetails?.accountHolderName) {
        return sendError(
          res,
          'Complete Bank Account details (Account Holder Name, Account Number, and IFSC Code) are required for Bank Transfer payout.',
          400,
          'VALIDATION_ERROR'
        );
      }
    }

    // 1. Verify Order exists and belongs to authenticated user
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    // 2. Prevent duplicate active refund requests on the same order
    const existingActiveRefund = await Refund.findOne({
      order: order._id,
      status: { $in: ['REQUESTED', 'UNDER_REVIEW', 'APPROVED', 'REFUND_INITIATED', 'REFUNDED'] }
    });

    if (existingActiveRefund) {
      return sendError(
        res,
        `A refund request (Status: ${existingActiveRefund.status}) already exists for Order ${order.orderNumber}.`,
        409,
        'DUPLICATE_REFUND_REQUEST',
        { existingRefundId: existingActiveRefund._id, status: existingActiveRefund.status }
      );
    }

    // 3. Authoritative refund amount (full order total)
    const refundAmount = order.pricing?.total || 0;
    const payment = await Payment.findOne({ order: order._id });

    // 4. Create Refund document with full banking and WhatsApp info
    const refund = await Refund.create({
      order: order._id,
      orderNumber: order.orderNumber,
      user: req.user._id,
      payment: payment ? payment._id : undefined,
      reason,
      description: description.trim(),
      images: Array.isArray(images) ? images : [],
      amount: refundAmount,
      payoutPreference: cleanPref,
      upiId: cleanUpiId,
      whatsappNumber: finalWhatsApp,
      bankDetails: {
        bankName: String(bankDetails.bankName || '').trim(),
        accountHolderName: String(bankDetails.accountHolderName || '').trim(),
        accountNumber: String(bankDetails.accountNumber || '').trim(),
        ifscCode: String(bankDetails.ifscCode || '').trim().toUpperCase()
      },
      status: 'REQUESTED',
      history: [{
        status: 'REQUESTED',
        changedBy: req.user._id,
        changedByRole: req.user.role,
        note: `Refund requested by customer via ${cleanPref}. WhatsApp: ${finalWhatsApp}`,
        timestamp: new Date()
      }]
    });

    // 5. Update User record with WhatsApp number if user phone not set
    if (!req.user.phone) {
      await User.findByIdAndUpdate(req.user._id, { phone: finalWhatsApp });
    }

    // 6. Update Order status note / transition to RETURN_REQUESTED if delivered
    if (order.orderStatus === 'DELIVERED') {
      order.orderStatus = 'RETURN_REQUESTED';
      order.statusHistory.push({
        status: 'RETURN_REQUESTED',
        changedBy: req.user._id,
        changedByRole: req.user.role,
        note: `Return/Refund requested by customer: ${reason}`,
        timestamp: new Date()
      });
      await order.save();
    }

    // 7. Multi-Channel Notifications (Non-blocking)
    // In-App Notification Panel
    createInAppNotification({
      userId: req.user._id,
      type: 'REFUND',
      title: `Refund Request Received: ${order.orderNumber}`,
      message: `Your refund request for ₹${refundAmount} (${reason}) via ${cleanPref} has been received and is pending review.`,
      link: `/orders/${order._id}`,
      metadata: { refundId: refund._id, orderId: order._id }
    }).catch(() => {});

    // WhatsApp Notification
    whatsappService.sendRefundRequestReceived({
      to: finalWhatsApp,
      userName: req.user.name,
      orderNumber: order.orderNumber,
      amount: refundAmount,
      reason,
      payoutPreference: cleanPref
    }).catch(() => {});

    // SMS Notification
    smsService.sendRefundReceivedSms({
      to: finalWhatsApp,
      orderNumber: order.orderNumber,
      amount: refundAmount
    }).catch(() => {});

    // Email Notification
    sendRefundUpdateEmail({
      user: req.user,
      order,
      refundAmount,
      status: 'REQUESTED'
    }).catch(() => {});

    // 8. Audit Log
    await createAuditLog({
      req,
      action: 'REFUND_REQUESTED',
      resourceType: 'Refund',
      resourceId: refund._id,
      changes: {
        orderNumber: order.orderNumber,
        reason,
        amount: refundAmount,
        payoutPreference: cleanPref,
        upiId: cleanUpiId,
        whatsappNumber: finalWhatsApp
      }
    });

    return sendSuccess(res, 'Refund request submitted successfully. Real-time updates will be sent to your WhatsApp and Notification panel.', { refund }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Customer: GET /api/refunds
 * Get logged-in user's refund requests
 */
const getCustomerRefunds = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const skip = (page - 1) * limit;

    const [refunds, total] = await Promise.all([
      Refund.find({ user: req.user._id })
        .populate('order', 'orderNumber pricing items paymentMethod paymentStatus orderStatus createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Refund.countDocuments({ user: req.user._id })
    ]);

    return sendSuccess(res, 'Refund requests retrieved.', {
      refunds,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRefunds: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Customer & Admin: GET /api/refunds/:id
 * Get single refund details
 */
const getRefundById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const query = { _id: id };
    if (req.user.role !== 'ADMIN') {
      query.user = req.user._id;
    }

    const refund = await Refund.findOne(query)
      .populate('order')
      .populate('user', 'name email phone businessName')
      .populate('payment');

    if (!refund) {
      return sendError(res, 'Refund request not found.', 404, 'NOT_FOUND');
    }

    return sendSuccess(res, 'Refund details retrieved.', { refund });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: GET /api/admin/refunds
 * List all platform refund requests with search & status filters
 */
const adminGetAllRefunds = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const { status, search } = req.query;

    const query = {};

    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { reason: { $regex: search, $options: 'i' } },
        { upiId: { $regex: search, $options: 'i' } },
        { whatsappNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const [refunds, total, statusAgg] = await Promise.all([
      Refund.find(query)
        .populate('user', 'name email phone')
        .populate('order', 'orderNumber pricing paymentMethod paymentStatus orderStatus')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Refund.countDocuments(query),
      Refund.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$amount' } } }
      ])
    ]);

    const summary = {};
    let totalRefundAmount = 0;
    statusAgg.forEach(({ _id, count, totalAmount }) => {
      summary[_id] = count;
      totalRefundAmount += totalAmount || 0;
    });

    return sendSuccess(res, 'Admin: refunds retrieved.', {
      refunds,
      summary,
      totalRefundAmount,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalRefunds: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: PATCH /api/admin/refunds/:id
 * Review, Grant, Complete, or Reject a refund with instant multi-channel WhatsApp, SMS, In-App alerts.
 */
const adminUpdateRefundStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      status,
      adminNotes = '',
      rejectedReason = '',
      transactionReference = '',
      restockToInventory = false
    } = req.body;

    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return sendError(
        res,
        `Invalid status. Allowed statuses: ${VALID_STATUSES.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const newStatus = status.toUpperCase();

    const refund = await Refund.findById(id)
      .populate('order')
      .populate('user')
      .populate('payment');

    if (!refund) {
      return sendError(res, 'Refund request not found.', 404, 'NOT_FOUND');
    }

    const prevStatus = refund.status;
    const order = refund.order;

    // Apply status updates
    refund.status = newStatus;
    if (adminNotes) refund.adminNotes = adminNotes.trim();
    if (rejectedReason) refund.rejectedReason = rejectedReason.trim();

    // ── REAL-TIME UPI / BANK PAYOUT EXECUTION ────────────────────────────────
    if (newStatus === 'APPROVED' || newStatus === 'REFUNDED') {
      let finalTxnRef = (transactionReference && transactionReference.trim()) || '';
      let payoutId = '';

      try {
        const payoutResult = await upiPayoutService.sendRefundPayout({
          refundId: refund._id,
          orderNumber: refund.orderNumber,
          orderId: order?._id,
          amountRupees: refund.amount,
          payoutPreference: refund.payoutPreference || 'UPI',
          upiId: refund.upiId,
          bankDetails: refund.bankDetails || {},
          customerName: refund.user?.name || 'Customer',
          customerEmail: refund.user?.email || '',
          customerPhone: refund.whatsappNumber || refund.user?.phone || ''
        });

        if (payoutResult && payoutResult.success) {
          if (!finalTxnRef && payoutResult.utr) {
            finalTxnRef = payoutResult.utr;
          }
          if (payoutResult.payoutId) {
            payoutId = payoutResult.payoutId;
            refund.gatewayRefundId = payoutId;
          }
        }
      } catch (payoutErr) {
        console.warn('[Real-Time Payout Warning]:', payoutErr.message);
      }

      if (!finalTxnRef) {
        finalTxnRef = refund.transactionReference || `TXN-REF-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      refund.transactionReference = finalTxnRef;
      refund.refundProcessedAt = new Date();
    }

    refund.processedAt = new Date();
    refund.processedBy = req.user._id;

    refund.history.push({
      status: newStatus,
      changedBy: req.user._id,
      changedByRole: 'ADMIN',
      note: adminNotes || rejectedReason || `Status changed from ${prevStatus} to ${newStatus}. Real-Time TxnRef: ${refund.transactionReference || 'N/A'}`,
      timestamp: new Date()
    });

    // ── INVENTORY RESTOCK LOGIC ──────────────────────────────────────────────
    if (
      (newStatus === 'APPROVED' || newStatus === 'REFUNDED') &&
      restockToInventory &&
      !refund.restockApproved
    ) {
      refund.restockApproved = true;

      if (order && order.items && order.items.length > 0) {
        for (const item of order.items) {
          const product = await Product.findById(item.product);
          if (product) {
            const prevStock = product.stock;
            product.stock += item.quantity;
            await product.save();

            // Record in InventoryTransaction ledger
            await InventoryTransaction.create({
              product: product._id,
              sku: product.sku,
              type: 'ORDER_RETURNED',
              quantity: item.quantity,
              previousStock: prevStock,
              newStock: product.stock,
              previousReserved: product.reservedStock || 0,
              newReserved: product.reservedStock || 0,
              reason: `Restocked ${item.quantity} units from Refund #${refund._id} (Order #${order.orderNumber})`,
              reference: order.orderNumber,
              performedBy: req.user._id
            });
          }
        }
      }
    }

    // ── GATEWAY & ORDER PAYMENT STATUS UPDATE ─────────────────────────────────
    if (newStatus === 'REFUNDED' || newStatus === 'APPROVED') {
      if (refund.payment) {
        await Payment.findByIdAndUpdate(refund.payment._id, {
          status: 'REFUNDED',
          refundAmount: refund.amount
        });
      }

      if (order) {
        order.paymentStatus = 'REFUNDED';
        order.orderStatus = 'REFUNDED';
        order.statusHistory.push({
          status: 'REFUNDED',
          changedBy: req.user._id,
          changedByRole: 'ADMIN',
          note: `Refund of ₹${refund.amount} completed by Admin. Real-Time Txn Ref: ${refund.transactionReference}`,
          timestamp: new Date()
        });
        await order.save();
      }

      // Execute Razorpay gateway refund if original payment was online
      if (
        isRazorpayConfigured() &&
        refund.payment?.razorpayPaymentId &&
        !refund.gatewayRefundId
      ) {
        try {
          const razorpay = getRazorpay();
          const rzpRefund = await razorpay.payments.refund(refund.payment.razorpayPaymentId, {
            amount: Math.round(refund.amount * 100), // in paise
            notes: {
              refundId: String(refund._id),
              orderNumber: refund.orderNumber
            }
          });
          refund.gatewayRefundId = rzpRefund.id;
        } catch (rzpErr) {
          console.warn('[Razorpay Gateway Refund Warning]', rzpErr.message);
        }
      }
    }

    await refund.save();

    // ── REAL-TIME MULTI-CHANNEL NOTIFICATIONS ────────────────────────────────
    const recipientWhatsApp = refund.whatsappNumber || refund.user?.phone;
    const recipientPhone = refund.user?.phone || refund.whatsappNumber;
    const payoutMethodText = refund.payoutPreference === 'UPI' ? 'UPI' : 'Bank Transfer';

    let payoutDetailsText = '';
    if (refund.payoutPreference === 'UPI') {
      payoutDetailsText = `UPI ID (${refund.upiId || 'Direct UPI'})`;
    } else if (refund.bankDetails?.accountNumber) {
      const maskedAc = `XXXX${refund.bankDetails.accountNumber.slice(-4)}`;
      payoutDetailsText = `${refund.bankDetails.bankName || 'Bank'} A/C ${maskedAc} (IFSC: ${refund.bankDetails.ifscCode})`;
    }

    if (newStatus === 'REFUNDED' || newStatus === 'APPROVED') {
      // 1. Instant WhatsApp Message
      if (recipientWhatsApp) {
        whatsappService.sendRefundSuccessMessage({
          to: recipientWhatsApp,
          userName: refund.user?.name || 'Customer',
          orderNumber: refund.orderNumber,
          amount: refund.amount,
          method: payoutMethodText,
          payoutDetails: payoutDetailsText,
          transactionRef: refund.transactionReference
        }).catch(() => {});
      }

      // 2. Real-Time In-App Notification Panel
      if (refund.user) {
        createInAppNotification({
          userId: refund.user._id,
          type: 'REFUND',
          title: `🎉 Refund Successful: ₹${refund.amount}`,
          message: `Your refund of ₹${refund.amount} for Order #${refund.orderNumber} has been successfully processed to your ${payoutMethodText} (${refund.transactionReference || 'Real-time'}).`,
          link: `/orders/${order?._id || ''}`,
          metadata: { refundId: refund._id, status: newStatus, transactionReference: refund.transactionReference }
        }).catch(() => {});
      }

      // 3. Real-Time SMS Alert
      if (recipientPhone) {
        smsService.sendRefundSuccessSms({
          to: recipientPhone,
          orderNumber: refund.orderNumber,
          amount: refund.amount,
          method: payoutMethodText,
          transactionRef: refund.transactionReference
        }).catch(() => {});
      }

      // 4. Email Confirmation
      if (refund.user) {
        sendRefundUpdateEmail({
          user: refund.user,
          order: order || { orderNumber: refund.orderNumber, pricing: { total: refund.amount } },
          refundAmount: refund.amount,
          status: 'REFUNDED'
        }).catch(() => {});
      }
    } else {
      // For other status updates (UNDER_REVIEW, REJECTED, etc.)
      if (refund.user) {
        createInAppNotification({
          userId: refund.user._id,
          type: 'REFUND',
          title: `Refund Status: ${newStatus}`,
          message: `Your refund request for Order ${refund.orderNumber} is now ${newStatus}.${rejectedReason ? ` Reason: ${rejectedReason}` : ''}`,
          link: `/orders/${order?._id || ''}`,
          metadata: { refundId: refund._id, status: newStatus }
        }).catch(() => {});

        sendRefundUpdateEmail({
          user: refund.user,
          order: order || { orderNumber: refund.orderNumber, pricing: { total: refund.amount } },
          refundAmount: refund.amount,
          status: newStatus
        }).catch(() => {});
      }
    }

    // ── AUDIT LOG ────────────────────────────────────────────────────────────
    await createAuditLog({
      req,
      action: 'REFUND_STATUS_UPDATE',
      resourceType: 'Refund',
      resourceId: refund._id,
      changes: {
        before: { status: prevStatus },
        after: {
          status: newStatus,
          transactionReference: refund.transactionReference,
          restockApproved: refund.restockApproved
        },
        adminNotes,
        rejectedReason
      }
    });

    return sendSuccess(res, `Refund status updated to ${newStatus} and customer notified across WhatsApp, SMS, and In-App notification panel.`, { refund });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createRefundRequest,
  getCustomerRefunds,
  getRefundById,
  adminGetAllRefunds,
  adminUpdateRefundStatus
};
