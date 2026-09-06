const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'ORDER',
  'PAYMENT',
  'REFUND',
  'B2B',
  'PROMOTION',
  'SYSTEM',
  'B2B_STATUS'
];

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User is required'],
    index: true
  },
  type: {
    type: String,
    enum: NOTIFICATION_TYPES,
    default: 'SYSTEM',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    trim: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  link: {
    type: String,
    default: '',
    trim: true
  },
  readAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Alias isRead with read
notificationSchema.virtual('isRead')
  .get(function () { return this.read; })
  .set(function (v) { this.read = v; });

notificationSchema.pre('save', function (next) {
  if (this.read && !this.readAt) {
    this.readAt = new Date();
  } else if (!this.read) {
    this.readAt = null;
  }
  next();
});

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
