const mongoose = require('mongoose');

const B2B_REQUEST_TYPES = [
  'Custom Pricing',
  'Large Order',
  'Recurring Supply',
  'Custom Packaging',
  'Product Request',
  'BULK_ORDER',
  'CUSTOM_PACKAGING',
  'DISTRIBUTORSHIP',
  'OTHER'
];

const B2B_REQUEST_STATUSES = [
  'PENDING',
  'REVIEWING',
  'ACCEPTED',
  'REJECTED',
  'COUNTER_OFFER',
  'CONVERTED_TO_ORDER',
  'OPEN',
  'IN_REVIEW',
  'QUOTED',
  'CLOSED'
];

const requestedProductSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  productName: String,
  requestedQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  targetPrice: Number
}, { _id: true });

const b2bRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  companyName: {
    type: String,
    required: [true, 'Company/Business name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  gstin: {
    type: String,
    uppercase: true,
    trim: true
  },
  requestType: {
    type: String,
    enum: B2B_REQUEST_TYPES,
    default: 'Custom Pricing'
  },
  requestedQuantity: {
    type: Number,
    default: 1
  },
  requestedPrice: {
    type: Number,
    default: 0
  },
  estimatedVolume: String,
  products: [requestedProductSchema],
  message: {
    type: String,
    required: [true, 'Please provide details of your business requirement'],
    trim: true
  },
  status: {
    type: String,
    enum: B2B_REQUEST_STATUSES,
    default: 'PENDING',
    index: true
  },
  adminResponse: String,
  counterOfferPrice: Number,
  adminNotes: String,
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('B2BRequest', b2bRequestSchema);
