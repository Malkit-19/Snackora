const mongoose = require('mongoose');
const { B2B_STATUS } = require('../config/constants');

const b2bApplicationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  companyName: {
    type: String,
    required: [true, 'Business/Company name is required'],
    trim: true,
    index: true
  },
  ownerName: {
    type: String,
    required: [true, 'Owner/Contact name is required'],
    trim: true
  },
  businessType: {
    type: String,
    required: [true, 'Business type is required'],
    trim: true
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    uppercase: true,
    trim: true,
    index: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email address is required'],
    lowercase: true,
    trim: true,
    index: true
  },
  businessAddress: {
    street: { type: String, default: 'Commercial Hub', trim: true },
    city: { type: String, default: 'Mumbai', trim: true },
    state: { type: String, default: 'Maharashtra', trim: true },
    postalCode: { type: String, default: '400001', trim: true },
    country: { type: String, default: 'India', trim: true }
  },

  expectedMonthlyOrder: {
    type: String,
    trim: true
  },
  productsInterested: [{
    type: String,
    trim: true
  }],
  message: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: Object.values(B2B_STATUS),
    default: B2B_STATUS.PENDING,
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  adminNotes: String
}, {
  timestamps: true
});

module.exports = mongoose.model('B2BApplication', b2bApplicationSchema);
