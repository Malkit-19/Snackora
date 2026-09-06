const mongoose = require('mongoose');

/**
 * Payment model — stores the full lifecycle of a single payment attempt.
 *
 * Security rules:
 *  - Amount is ALWAYS recalculated server-side from the linked Order. Never trust client.
 *  - Razorpay signature is verified server-side using HMAC-SHA256 before marking CAPTURED.
 *  - razorpayPaymentId + signature are stored only AFTER successful verification.
 *  - Webhook processing uses idempotency check (razorpayPaymentId unique index).
 */
const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  orderNumber: {
    type: String,
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ── Payment method ──────────────────────────────────────────────────────────
  method: {
    type: String,
    enum: ['COD', 'UPI', 'CARD', 'NETBANKING'],
    required: true
  },

  // ── Authoritative amount fields (always server-calculated) ──────────────────
  amount: {
    type: Number,           // amount in paise (₹1 = 100 paise) for Razorpay, full ₹ for COD
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },

  // ── Razorpay-specific fields ────────────────────────────────────────────────
  razorpayOrderId: {
    type: String,
    sparse: true,
    index: true
  },
  razorpayPaymentId: {
    type: String,
    sparse: true,
    unique: true   // idempotency guard — prevents duplicate webhook processing
  },
  razorpaySignature: {
    type: String,
    sparse: true
  },

  // ── Payment lifecycle status ────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['CREATED', 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED'],
    default: 'PENDING',
    index: true
  },

  // ── Failure tracking ────────────────────────────────────────────────────────
  failureReason: {
    type: String,
    default: ''
  },
  failureCode: {
    type: String,
    default: ''
  },

  // ── Webhook & verification metadata ────────────────────────────────────────
  webhookVerified: {
    type: Boolean,
    default: false
  },
  webhookEventId: {
    type: String,
    sparse: true,
    index: true
  },

  // ── Extra metadata (raw webhook payload etc) ───────────────────────────────
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

paymentSchema.index({ order: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
