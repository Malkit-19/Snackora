const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Banner title is required'],
    trim: true
  },
  subtitle: {
    type: String,
    default: '',
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Banner image URL is required'],
    trim: true
  },
  ctaText: {
    type: String,
    default: 'Shop Now',
    trim: true
  },
  ctaUrl: {
    type: String,
    default: '/shop',
    trim: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  displayOrder: {
    type: Number,
    default: 0,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Aliases
bannerSchema.virtual('imageUrl')
  .get(function () { return this.image; })
  .set(function (v) { this.image = v; });

bannerSchema.virtual('cta')
  .get(function () { return this.ctaText; })
  .set(function (v) { this.ctaText = v; });

bannerSchema.virtual('ctaLink')
  .get(function () { return this.ctaUrl; })
  .set(function (v) { this.ctaUrl = v; });

bannerSchema.index({ isActive: 1, displayOrder: 1, startDate: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
