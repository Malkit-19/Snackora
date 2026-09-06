const crypto = require('crypto');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { getRazorpay, isRazorpayConfigured } = require('../config/razorpay');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Convert ₹ to paise (Razorpay works in the smallest currency unit)
// ─────────────────────────────────────────────────────────────────────────────
const toPaise = (amountInRupees) => Math.round(Number(amountInRupees) * 100);

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/payments/config
//    Returns the PUBLIC key_id only (never the secret).
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentConfig = (req, res) => {
  const configured = isRazorpayConfigured();
  const merchantUpiId = process.env.MERCHANT_UPI_ID || 'jkaur08@oksbi';
  const merchantPhone = process.env.MERCHANT_PHONE || '7021475382';
  const merchantName = process.env.MERCHANT_NAME || 'Snackora Foods';
  return sendSuccess(res, 'Payment gateway configuration.', {
    razorpayKeyId: configured ? process.env.RAZORPAY_KEY_ID : null,
    configured,
    merchantUpiId,
    merchantPhone,
    merchantName,
    supportedMethods: ['COD', 'UPI'],
    message: configured
      ? 'Razorpay and Direct UPI are configured. Real payments can be processed.'
      : 'Payment gateway configured for Direct UPI and COD.'
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/payments/create-razorpay-order
//    Creates a Razorpay Order on the gateway server.
//    Amount is ALWAYS read from the DB — never from the client body.
// ─────────────────────────────────────────────────────────────────────────────
const createRazorpayOrder = async (req, res, next) => {
  try {
    if (!isRazorpayConfigured()) {
      return sendError(
        res,
        'Razorpay payment gateway is not configured on this server. Please add your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the backend .env file.',
        503,
        'PAYMENT_GATEWAY_UNCONFIGURED'
      );
    }

    const { orderId } = req.body;
    if (!orderId) {
      return sendError(res, 'orderId is required.', 400, 'VALIDATION_ERROR');
    }

    // Fetch the order — must belong to the authenticated user
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    if (['CARD', 'UPI'].includes(order.paymentMethod) === false) {
      return sendError(
        res,
        'This order is not configured for online payment. COD orders do not require a Razorpay order.',
        400,
        'PAYMENT_METHOD_MISMATCH'
      );
    }

    if (order.paymentStatus === 'COMPLETED') {
      return sendError(res, 'This order has already been paid.', 409, 'ALREADY_PAID');
    }

    // Amount from DB only — NEVER trust client
    const amountInPaise = toPaise(order.pricing.total);

    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        orderNumber: order.orderNumber,
        userId: String(req.user._id)
      }
    });

    // Persist Razorpay Order ID on our order
    order.razorpayOrderId = rzpOrder.id;
    await order.save();

    // Create a Payment record in CREATED status
    const payment = await Payment.create({
      order: order._id,
      orderNumber: order.orderNumber,
      user: req.user._id,
      method: order.paymentMethod,
      amount: amountInPaise,
      currency: 'INR',
      razorpayOrderId: rzpOrder.id,
      status: 'CREATED'
    });

    return sendSuccess(res, 'Razorpay order created. Open the checkout.', {
      razorpayOrderId: rzpOrder.id,
      amount: amountInPaise,           // paise
      amountDisplay: order.pricing.total, // ₹ for UI display
      currency: 'INR',
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      orderNumber: order.orderNumber
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. POST /api/payments/verify
//    Called by the client AFTER Razorpay checkout succeeds client-side.
//    ALWAYS re-verifies the HMAC-SHA256 signature server-side.
//    NEVER trusts a client-claimed success without signature verification.
// ─────────────────────────────────────────────────────────────────────────────
const verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderId
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
      return sendError(res, 'razorpayOrderId, razorpayPaymentId, razorpaySignature, and orderId are all required.', 400, 'VALIDATION_ERROR');
    }

    // 1. Fetch the order — must belong to the authenticated user
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    // 2. Idempotency guard: if already COMPLETED, don't process again
    if (order.paymentStatus === 'COMPLETED') {
      return sendSuccess(res, 'This order payment has already been verified and completed.', {
        alreadyCompleted: true,
        orderNumber: order.orderNumber
      });
    }

    // 3. Verify razorpayOrderId matches what we stored — prevent ID swapping attacks
    if (order.razorpayOrderId !== razorpayOrderId) {
      return sendError(
        res,
        'Razorpay Order ID mismatch. Payment verification failed.',
        400,
        'RAZORPAY_ORDER_ID_MISMATCH'
      );
    }

    // 4. Server-side HMAC-SHA256 signature verification
    //    Expected: HMAC-SHA256(razorpayOrderId + "|" + razorpayPaymentId, KEY_SECRET)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const signatureValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(razorpaySignature, 'hex')
    );

    if (!signatureValid) {
      // Mark payment as FAILED
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        { status: 'FAILED', failureReason: 'Signature verification failed' }
      );
      return sendError(
        res,
        'Payment signature verification failed. This payment attempt has been rejected.',
        400,
        'SIGNATURE_VERIFICATION_FAILED'
      );
    }

    // 5. Signature valid — update Payment record
    await Payment.findOneAndUpdate(
      { razorpayOrderId },
      {
        razorpayPaymentId,
        razorpaySignature,
        status: 'CAPTURED',
        webhookVerified: false   // will be set true when webhook arrives
      }
    );

    // 6. Update Order: paymentStatus → COMPLETED, orderStatus → CONFIRMED
    order.paymentStatus = 'COMPLETED';
    order.orderStatus = 'CONFIRMED';
    order.razorpayOrderId = razorpayOrderId;
    order.statusHistory.push({
      status: 'CONFIRMED',
      changedBy: req.user._id,
      changedByRole: req.user.role,
      note: `Payment captured via Razorpay. PaymentID: ${razorpayPaymentId}`,
      timestamp: new Date()
    });
    await order.save();

    await createAuditLog({
      req,
      action: 'PAYMENT_VERIFIED',
      resourceType: 'Order',
      resourceId: order._id,
      changes: {
        before: { paymentStatus: 'PENDING', orderStatus: 'PLACED' },
        after: {
          orderNumber: order.orderNumber,
          razorpayOrderId,
          razorpayPaymentId,
          method: order.paymentMethod,
          amount: order.pricing.total,
          signatureVerified: true,
          paymentStatus: 'COMPLETED',
          orderStatus: 'CONFIRMED'
        }
      }
    });

    return sendSuccess(res, 'Payment verified and order confirmed!', {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      razorpayPaymentId
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/payments/webhook
//    Razorpay webhook handler.
//    - Verifies webhook signature using RAZORPAY_WEBHOOK_SECRET
//    - Idempotent: skips already-processed payments
//    - Raw body required for signature verification (no JSON parsing)
// ─────────────────────────────────────────────────────────────────────────────
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';
    const signature = req.headers['x-razorpay-signature'] || '';

    if (!webhookSecret || webhookSecret.includes('REPLACE_WITH_YOUR')) {
      console.warn('[Webhook] RAZORPAY_WEBHOOK_SECRET not configured. Skipping signature verification.');
      return res.status(200).json({ received: true, note: 'Webhook secret not configured.' });
    }

    // req.body is the raw Buffer when express.raw() is used on this route
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));

    // Verify webhook authenticity using HMAC-SHA256
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const sigValid = crypto.timingSafeEqual(
      Buffer.from(expectedSig, 'hex'),
      Buffer.from(signature, 'hex')
    );

    if (!sigValid) {
      console.warn('[Webhook] Invalid webhook signature received — ignoring.');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const payload = JSON.parse(rawBody.toString());
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    console.log(`[Webhook] Received event: ${event}`);

    if (!paymentEntity) {
      return res.status(200).json({ received: true, note: 'No payment entity in payload.' });
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;
    const webhookEventId = payload.account_id + '_' + payload.created_at;

    // ── IDEMPOTENCY CHECK ────────────────────────────────────────────────────
    // If a Payment with this razorpayPaymentId already exists and is CAPTURED/REFUNDED,
    // skip reprocessing to prevent duplicate operations.
    const existingPayment = await Payment.findOne({ razorpayPaymentId });
    if (existingPayment && ['CAPTURED', 'REFUNDED'].includes(existingPayment.status)) {
      console.log(`[Webhook] Already processed payment ${razorpayPaymentId} — skipping (idempotent).`);
      return res.status(200).json({ received: true, idempotent: true });
    }

    // ── EVENT HANDLERS ───────────────────────────────────────────────────────
    if (event === 'payment.captured') {
      // Update Payment record
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          razorpayPaymentId,
          status: 'CAPTURED',
          webhookVerified: true,
          webhookEventId,
          metadata: { webhookPayload: paymentEntity }
        }
      );

      // Update Order
      const order = await Order.findOne({ razorpayOrderId });
      if (order && order.paymentStatus !== 'COMPLETED') {
        order.paymentStatus = 'COMPLETED';
        if (order.orderStatus === 'PLACED') {
          order.orderStatus = 'CONFIRMED';
          order.statusHistory.push({
            status: 'CONFIRMED',
            changedByRole: 'SYSTEM',
            note: `Payment captured via Razorpay webhook. PaymentID: ${razorpayPaymentId}`,
            timestamp: new Date()
          });
        }
        await order.save();
        console.log(`[Webhook] Order ${order.orderNumber} confirmed via payment.captured webhook.`);
      }
    } else if (event === 'payment.failed') {
      await Payment.findOneAndUpdate(
        { razorpayOrderId },
        {
          razorpayPaymentId,
          status: 'FAILED',
          failureReason: paymentEntity.error_description || 'Payment failed',
          failureCode: paymentEntity.error_code || '',
          webhookVerified: true,
          webhookEventId,
          metadata: { webhookPayload: paymentEntity }
        }
      );

      const order = await Order.findOne({ razorpayOrderId });
      if (order) {
        order.paymentStatus = 'FAILED';
        await order.save();
        console.log(`[Webhook] Order ${order?.orderNumber} payment failed.`);
      }
    } else if (event === 'refund.processed') {
      const refundEntity = payload.payload?.refund?.entity;
      const refundOrderId = refundEntity?.payment_id ? null : razorpayOrderId;
      await Payment.findOneAndUpdate(
        { razorpayPaymentId: refundEntity?.payment_id || razorpayPaymentId },
        {
          status: 'REFUNDED',
          webhookVerified: true,
          metadata: { refundPayload: refundEntity }
        }
      );
      console.log(`[Webhook] Refund processed for payment ${refundEntity?.payment_id}.`);
    } else {
      console.log(`[Webhook] Unhandled event type: ${event} — acknowledged.`);
    }

    // Always respond 200 quickly to prevent Razorpay from retrying
    return res.status(200).json({ received: true, event });
  } catch (error) {
    console.error('[Webhook Error]', error.message);
    // Still return 200 to prevent Razorpay from flooding retries
    return res.status(200).json({ received: true, error: 'Internal processing error.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/payments/order/:orderId
//    Get payment details for a specific order (user must own it)
// ─────────────────────────────────────────────────────────────────────────────
const getPaymentByOrder = async (req, res, next) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    const payment = await Payment.findOne({ order: order._id });

    return sendSuccess(res, 'Payment details retrieved.', {
      orderNumber: order.orderNumber,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      pricing: order.pricing,
      payment: payment || null
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. POST /api/payments/verify-direct-upi
//    Capture & verify direct UPI scan payments with UTR/transaction reference.
// ─────────────────────────────────────────────────────────────────────────────
const verifyDirectUpiPayment = async (req, res, next) => {
  try {
    const { orderId, utr, paymentMethod = 'UPI' } = req.body;

    if (!orderId) {
      return sendError(res, 'orderId is required.', 400, 'VALIDATION_ERROR');
    }

    // Fetch the order — must belong to the authenticated user
    const order = await Order.findOne({ _id: orderId, user: req.user._id });
    if (!order) {
      return sendError(res, 'Order not found.', 404, 'NOT_FOUND');
    }

    // Idempotency guard: if already COMPLETED, return success
    if (order.paymentStatus === 'COMPLETED') {
      return sendSuccess(res, 'This order payment has already been verified and completed.', {
        alreadyCompleted: true,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus
      });
    }

    const amountInPaise = toPaise(order.pricing.total);
    const transactionRef = utr && String(utr).trim() ? String(utr).trim() : `UPI-${Date.now()}`;

    // Create or update Payment record
    let payment = await Payment.findOne({ order: order._id });
    if (!payment) {
      payment = await Payment.create({
        order: order._id,
        orderNumber: order.orderNumber,
        user: req.user._id,
        method: 'UPI',
        amount: amountInPaise,
        currency: 'INR',
        status: 'CAPTURED',
        metadata: {
          utr: transactionRef,
          payeeUpi: process.env.MERCHANT_UPI_ID || 'jkaur08@oksbi',
          payeePhone: process.env.MERCHANT_PHONE || '7021475382',
          verifiedAt: new Date()
        }
      });
    } else {
      payment.status = 'CAPTURED';
      payment.method = 'UPI';
      payment.metadata = {
        ...(payment.metadata || {}),
        utr: transactionRef,
        payeeUpi: process.env.MERCHANT_UPI_ID || 'jkaur08@oksbi',
        payeePhone: process.env.MERCHANT_PHONE || '7021475382',
        verifiedAt: new Date()
      };
      await payment.save();
    }

    // Update Order Status
    order.paymentMethod = 'UPI';
    order.paymentStatus = 'COMPLETED';
    order.orderStatus = 'CONFIRMED';
    order.statusHistory.push({
      status: 'CONFIRMED',
      changedBy: req.user._id,
      changedByRole: req.user.role,
      note: `Direct UPI Payment verified. Ref/UTR: ${transactionRef}`,
      timestamp: new Date()
    });
    await order.save();

    await createAuditLog({
      req,
      action: 'PAYMENT_VERIFIED_DIRECT_UPI',
      resourceType: 'Order',
      resourceId: order._id,
      changes: {
        before: { paymentStatus: 'PENDING', orderStatus: 'PLACED' },
        after: {
          orderNumber: order.orderNumber,
          method: 'UPI',
          amount: order.pricing.total,
          utr: transactionRef,
          paymentStatus: 'COMPLETED',
          orderStatus: 'CONFIRMED'
        }
      }
    });

    return sendSuccess(res, 'UPI Payment verified successfully and order confirmed!', {
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      transactionRef
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPaymentConfig,
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getPaymentByOrder,
  verifyDirectUpiPayment
};
