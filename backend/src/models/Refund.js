const mongoose = require('mongoose');

const REFUND_STATUSES = [
  'REQUESTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'REFUND_INITIATED',
  'REFUNDED',
  'PENDING',
  'PROCESSED',
  'FAILED'
];

const REFUND_REASONS = [
  'Damaged',
  'Wrong Product',
  'Missing Product',
  'Quality Issue',
  'Other'
];

const refundHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: REFUND_STATUSES,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  changedByRole: {
    type: String,
    default: 'SYSTEM'
  },
  note: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const refundSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required'],
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
    required: [true, 'User reference is required'],
    index: true
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    index: true
  },
  reason: {
    type: String,
    enum: REFUND_REASONS,
    required: [true, 'Refund reason is required'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Detailed description of the refund issue is required'],
    trim: true
  },
  images: [{
    type: String,
    trim: true
  }],
  amount: {
    type: Number,
    required: [true, 'Refund amount is required'],
    min: [0, 'Refund amount cannot be negative']
  },
  payoutPreference: {
    type: String,
    enum: ['UPI', 'BANK_TRANSFER'],
    default: 'UPI',
    index: true
  },
  upiId: {
    type: String,
    trim: true,
    default: ''
  },
  whatsappNumber: {
    type: String,
    trim: true,
    default: ''
  },
  bankDetails: {
    bankName: { type: String, trim: true, default: '' },
    accountHolderName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    ifscCode: { type: String, uppercase: true, trim: true, default: '' }
  },
  transactionReference: {
    type: String,
    trim: true,
    default: '',
    index: true
  },
  status: {
    type: String,
    enum: REFUND_STATUSES,
    default: 'REQUESTED',
    index: true
  },
  adminNotes: {
    type: String,
    default: '',
    trim: true
  },
  rejectedReason: {
    type: String,
    default: '',
    trim: true
  },
  restockApproved: {
    type: Boolean,
    default: false
  },
  gatewayRefundId: {
    type: String,
    sparse: true,
    index: true
  },
  processedAt: Date,
  refundProcessedAt: Date,
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  history: [refundHistorySchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

refundSchema.virtual('refundAmount')
  .get(function () { return this.amount; })
  .set(function (v) { this.amount = v; });

refundSchema.index({ user: 1, createdAt: -1 });
refundSchema.index({ order: 1, status: 1 });

module.exports = mongoose.model('Refund', refundSchema);
