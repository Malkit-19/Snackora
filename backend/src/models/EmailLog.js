const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema({
  recipient: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  templateType: {
    type: String,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['SENT', 'FAILED', 'PENDING_RETRY'],
    default: 'SENT',
    index: true
  },
  error: {
    type: String,
    default: ''
  },
  retryCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

emailLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
