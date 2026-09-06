const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [120, 'Product name cannot exceed 120 characters'],
    index: true
  },
  slug: {
    type: String,
    required: [true, 'Product slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  sku: {
    type: String,
    required: [true, 'Product SKU is required'],
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  shortDescription: {
    type: String,
    trim: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Product category is required'],
    index: true
  },
  flavour: {
    type: String,
    trim: true,
    default: 'Original',
    index: true
  },
  weight: {
    type: String,
    trim: true,
    default: '100g'
  },
  unit: {
    type: String,
    default: '1 unit',
    trim: true
  },
  ingredients: [{
    type: String,
    trim: true
  }],
  // Pricing
  mrp: {
    type: Number,
    min: [0, 'MRP cannot be negative']
  },
  retailPrice: {
    type: Number,
    required: [true, 'Retail price is required'],
    min: [0, 'Retail price cannot be negative'],
    index: true
  },
  retailDiscountPrice: {
    type: Number,
    min: [0, 'Discount price cannot be negative']
  },
  b2bPrice: {
    type: Number,
    min: [0, 'B2B price cannot be negative']
  },
  wholesalePrice: {
    type: Number,
    min: [0, 'Wholesale price cannot be negative']
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Inventory
  stock: {
    type: Number,
    required: [true, 'Stock count is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0,
    index: true
  },
  reservedStock: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0
  },
  moq: {
    type: Number,
    default: 10,
    min: [1, 'MOQ must be at least 1']
  },
  b2bMoq: {
    type: Number,
    default: 10,
    min: [1, 'B2B MOQ must be at least 1']
  },
  images: [{
    url: { type: String, required: true },
    alt: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false }
  }],
  featured: {
    type: Boolean,
    default: false,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0
  },
  ratings: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0, min: 0 }
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  nutritionalInfo: {
    calories: String,
    protein: String,
    carbs: String,
    fat: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: availableStock = stock - reservedStock
productSchema.virtual('availableStock').get(function () {
  const stockVal = typeof this.stock === 'number' ? this.stock : 0;
  const resVal = typeof this.reservedStock === 'number' ? this.reservedStock : 0;
  return Math.max(stockVal - resVal, 0);
});

// Virtual: stockStatus (IN_STOCK, LOW_STOCK, OUT_OF_STOCK)
productSchema.virtual('stockStatus').get(function () {
  const avail = this.availableStock;
  const threshold = typeof this.lowStockThreshold === 'number' ? this.lowStockThreshold : 10;

  if (avail <= 0) return 'OUT_OF_STOCK';
  if (avail <= threshold) return 'LOW_STOCK';
  return 'IN_STOCK';
});

// Pre-save synchronization for aliases
productSchema.pre('save', function (next) {
  // Sync mrp with retailPrice
  if (!this.mrp && this.retailPrice) this.mrp = this.retailPrice;
  if (!this.retailPrice && this.mrp) this.retailPrice = this.mrp;

  // Sync wholesalePrice with b2bPrice
  if (this.wholesalePrice && !this.b2bPrice) this.b2bPrice = this.wholesalePrice;
  if (this.b2bPrice && !this.wholesalePrice) this.wholesalePrice = this.b2bPrice;

  // Sync moq with b2bMoq
  if (this.moq && !this.b2bMoq) this.b2bMoq = this.moq;
  if (this.b2bMoq && !this.moq) this.moq = this.b2bMoq;

  // Sync featured with isFeatured
  if (this.featured !== undefined) this.isFeatured = this.featured;
  if (this.isFeatured !== undefined) this.featured = this.isFeatured;

  // Sync active with isAvailable
  if (this.active !== undefined) this.isAvailable = this.active;
  if (this.isAvailable !== undefined) this.active = this.isAvailable;

  // Sync ratings
  if (this.rating) this.ratings.average = this.rating;
  if (this.ratings?.average) this.rating = this.ratings.average;
  if (this.reviewCount) this.ratings.count = this.reviewCount;
  if (this.ratings?.count) this.reviewCount = this.ratings.count;

  // Sync weight / unit
  if (this.weight && !this.unit) this.unit = this.weight;
  if (this.unit && !this.weight) this.weight = this.unit;

  next();
});

// Helper method to sanitize product payload based on B2B approval
productSchema.methods.toRoleSpecificJSON = function (isApprovedB2B = false) {
  const obj = this.toObject();
  if (!isApprovedB2B) {
    delete obj.wholesalePrice;
    delete obj.b2bPrice;
    delete obj.b2bMoq;
    delete obj.moq;
  }
  return obj;
};

// ── Performance Compound Indexes ──────────────────────────────────────────────

// Homepage featured products: isAvailable=true, isFeatured=true → sorted by rating
productSchema.index({ isAvailable: 1, isFeatured: 1, 'ratings.average': -1 });

// Shop page: category + availability (most common filter combo)
productSchema.index({ isAvailable: 1, category: 1, 'ratings.average': -1 });

// Price range filtering on shop page
productSchema.index({ isAvailable: 1, retailPrice: 1 });

// Category + rating for catalog sort
productSchema.index({ category: 1, 'ratings.average': -1 });

// Full-text search across name, description, tags, flavour
productSchema.index({ name: 'text', description: 'text', tags: 'text', flavour: 'text' });

module.exports = mongoose.model('Product', productSchema);
