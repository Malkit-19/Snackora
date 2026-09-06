const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['PERCENTAGE', 'FLAT', 'FIXED'],
    required: [true, 'Discount type is required'],
    default: 'PERCENTAGE'
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: [0, 'Discount value cannot be negative']
  },
  minimumOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  maximumDiscount: {
    type: Number,
    default: null,
    min: 0
  },
  expiry: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: true
  },
  usageLimit: {
    type: Number,
    default: 1000
  },
  usageCount: {
    type: Number,
    default: 0
  },
  perUserLimit: {
    type: Number,
    default: 1
  },
  usedBy: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    usedAt: { type: Date, default: Date.now }
  }],
  eligibleRole: {
    type: String,
    enum: ['ALL', 'CUSTOMER', 'B2B_WHOLESALER'],
    default: 'ALL'
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual aliases for compatibility
couponSchema.virtual('discountType')
  .get(function () { return this.type; })
  .set(function (v) { this.type = v; });

couponSchema.virtual('discountValue')
  .get(function () { return this.value; })
  .set(function (v) { this.value = v; });

couponSchema.virtual('minOrderAmount')
  .get(function () { return this.minimumOrder; })
  .set(function (v) { this.minimumOrder = v; });

couponSchema.virtual('maxDiscountAmount')
  .get(function () { return this.maximumDiscount; })
  .set(function (v) { this.maximumDiscount = v; });

couponSchema.virtual('endDate')
  .get(function () { return this.expiry; })
  .set(function (v) { this.expiry = v; });

couponSchema.virtual('usedCount')
  .get(function () { return this.usageCount; })
  .set(function (v) { this.usageCount = v; });

module.exports = mongoose.model('Coupon', couponSchema);
