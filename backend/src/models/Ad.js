const mongoose = require('mongoose');

const AD_PLACEMENTS = ['HOMEPAGE', 'SHOP', 'PRODUCT_PAGE'];

const adSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Ad title is required'],
    trim: true
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  image: {
    type: String,
    required: [true, 'Ad image URL is required'],
    trim: true
  },
  link: {
    type: String,
    default: '/shop',
    trim: true
  },
  placement: {
    type: String,
    enum: AD_PLACEMENTS,
    required: [true, 'Ad placement is required'],
    default: 'HOMEPAGE',
    index: true
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
  }
}, {
  timestamps: true
});

adSchema.index({ placement: 1, isActive: 1, startDate: 1 });

module.exports = mongoose.model('Ad', adSchema);
