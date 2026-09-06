const mongoose = require('mongoose');

const TRANSACTION_TYPES = [
  'ORDER_RESERVED',
  'ORDER_CANCELLED',
  'ORDER_RETURNED',
  'ADMIN_ADJUSTMENT',
  'DAMAGE',
  'EXPIRED',
  'PURCHASE',
  'SALE',
  'RETURN',
  'ADJUSTMENT',
  'RESERVE',
  'RELEASE'
];

const inventoryTransactionSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
    index: true
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    index: true
  },
  type: {
    type: String,
    enum: TRANSACTION_TYPES,
    required: [true, 'Transaction type is required'],
    index: true
  },
  quantity: {
    type: Number,
    required: [true, 'Transaction quantity is required']
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  previousReserved: {
    type: Number,
    default: 0
  },
  newReserved: {
    type: Number,
    default: 0
  },
  reference: {
    type: String,
    trim: true,
    index: true
  },
  referenceId: {
    type: String,
    trim: true
  },
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }
}, {
  timestamps: true
});

inventoryTransactionSchema.index({ product: 1, createdAt: -1 });
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
