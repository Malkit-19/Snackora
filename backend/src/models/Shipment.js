const mongoose = require('mongoose');

const SHIPMENT_STATUS = [
  'LABEL_CREATED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED'
];

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  location: { type: String, default: 'Fulfillment Hub' },
  message: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { _id: false });

const shipmentSchema = new mongoose.Schema({
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
  shipmentId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  courier: {
    type: String,
    required: true,
    default: 'Blue Dart'
  },
  trackingNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  trackingUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: SHIPMENT_STATUS,
    default: 'LABEL_CREATED',
    index: true
  },
  weightKg: {
    type: Number,
    default: 0.5,
    min: 0
  },
  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },
  origin: {
    name: { type: String, default: 'Snackora Artisan Warehouse' },
    phone: { type: String, default: '+91 98765 43210' },
    addressLine1: { type: String, default: 'Plot 42, Food Tech Park' },
    city: { type: String, default: 'Bengaluru' },
    state: { type: String, default: 'Karnataka' },
    pincode: { type: String, default: '560001' }
  },
  destination: {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    addressLine1: { type: String, required: true },
    addressLine2: { type: String, default: '' },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  events: [trackingEventSchema],
  provider: {
    type: String,
    enum: ['mock', 'shiprocket', 'delhivery', 'bluedart'],
    default: 'mock'
  },
  rawResponse: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

shipmentSchema.index({ order: 1, createdAt: -1 });

module.exports = mongoose.model('Shipment', shipmentSchema);
