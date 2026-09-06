const mongoose = require('mongoose');
const { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } = require('../config/constants');

// Allowed status values (de-duped from constants)
const ORDER_STATUS_VALUES = [
  'PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED',
  'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED',
  'RETURN_REQUESTED', 'REFUNDED'
];

const PAYMENT_STATUS_VALUES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
const PAYMENT_METHOD_VALUES = ['COD', 'UPI', 'CARD', 'NETBANKING'];

/**
 * Immutable order item snapshot.
 * Stores the exact values at time of purchase.
 * Never recalculates from current product prices.
 */
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  // ── Snapshot fields (frozen at order time) ──────────────────────────────────
  name: { type: String, required: true },         // product name at purchase time
  sku: { type: String, required: true },          // SKU at purchase time
  image: { type: String, default: '' },           // primary image URL at purchase time
  slug: { type: String, default: '' },            // for linking back to PDP
  category: { type: String, default: '' },        // category name at purchase time
  unit: { type: String, default: '' },            // weight/size descriptor

  price: { type: Number, required: true, min: 0 },    // authoritative unit price (never current price)
  mrp: { type: Number, default: 0, min: 0 },          // MRP at purchase time (for display)
  quantity: { type: Number, required: true, min: 1 },
  itemDiscount: { type: Number, default: 0, min: 0 }, // per-item discount amount
  total: { type: Number, required: true, min: 0 },    // price * quantity (frozen)

  isWholesale: { type: Boolean, default: false },
  moq: { type: Number, default: 1 }
}, { _id: true });

/**
 * Status history entry — tracks every status change with timestamp and actor.
 */
const statusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: ORDER_STATUS_VALUES, required: true },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changedByRole: { type: String, default: 'SYSTEM' },
  note: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: true });

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Order must belong to a user'],
    index: true
  },
  isB2BOrder: {
    type: Boolean,
    default: false,
    index: true
  },
  items: {
    type: [orderItemSchema],
    validate: {
      validator: (arr) => arr.length > 0,
      message: 'Order must have at least one item.'
    }
  },

  // ── Immutable address snapshot ───────────────────────────────────────────────
  // Editing/deleting the address later NEVER modifies this document.
  shippingAddress: {
    addressId: { type: mongoose.Schema.Types.ObjectId, ref: 'Address' }, // traceability ref only
    fullName: { type: String, required: true },
    name: { type: String },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    postalCode: { type: String },
    country: { type: String, default: 'India' },
    label: { type: String, default: 'Home' }
  },

  // ── Authoritative pricing snapshot ─────────────────────────────────────────
  pricing: {
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    tax: { type: Number, default: 0, min: 0 },
    shippingFee: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },

  couponApplied: {
    code: { type: String },
    discountAmount: { type: Number, default: 0 }
  },

  paymentMethod: {
    type: String,
    enum: PAYMENT_METHOD_VALUES,
    required: true,
    index: true
  },
  paymentStatus: {
    type: String,
    enum: PAYMENT_STATUS_VALUES,
    default: 'PENDING',
    index: true
  },

  orderStatus: {
    type: String,
    enum: ORDER_STATUS_VALUES,
    default: 'PLACED',
    index: true
  },

  // ── Status tracking ─────────────────────────────────────────────────────────
  statusHistory: [statusHistorySchema],

  // ── Payment gateway references ──────────────────────────────────────────────
  razorpayOrderId: {
    type: String,
    sparse: true,
    index: true
  },
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    sparse: true
  },

  // ── Idempotency ─────────────────────────────────────────────────────────────
  idempotencyKey: {
    type: String,
    sparse: true,
    unique: true
  },

  // ── Shipping & logistics ─────────────────────────────────────────────────────
  trackingNumber: { type: String, trim: true, sparse: true },
  carrier: { type: String, trim: true },
  estimatedDelivery: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  cancellationReason: { type: String, default: '' },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

// ── Indexes ──────────────────────────────────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, createdAt: -1 });
orderSchema.index({ isB2BOrder: 1, orderStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
