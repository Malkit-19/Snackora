const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  userName: {
    type: String,
    trim: true,
    default: 'Snackora Customer'
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Rating must be at least 1 star'],
    max: [5, 'Rating cannot exceed 5 stars'],
    index: true
  },
  title: {
    type: String,
    trim: true,
    maxlength: [120, 'Title cannot exceed 120 characters'],
    default: ''
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Review cannot exceed 1000 characters']
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  helpfulCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['APPROVED', 'PENDING', 'REJECTED'],
    default: 'APPROVED',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Alias body with comment
reviewSchema.virtual('body')
  .get(function () { return this.comment; })
  .set(function (v) { this.comment = v; });

// Ensure a user can review a product at most once
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

/**
 * Static method to calculate and sync ratings with Product model
 */
reviewSchema.statics.syncProductRating = async function (productId) {
  const Product = mongoose.model('Product');

  const stats = await this.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(productId), status: 'APPROVED' } },
    {
      $group: {
        _id: '$product',
        avgRating: { $avg: '$rating' },
        reviewCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    const rawAvg = stats[0].avgRating || 0;
    const roundedAvg = Math.round(rawAvg * 10) / 10; // round to 1 decimal
    const count = stats[0].reviewCount || 0;

    await Product.findByIdAndUpdate(productId, {
      'ratings.average': roundedAvg,
      'ratings.count': count,
      rating: roundedAvg,
      reviewCount: count
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      'ratings.average': 0,
      'ratings.count': 0,
      rating: 0,
      reviewCount: 0
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);
