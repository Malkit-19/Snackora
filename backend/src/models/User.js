const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');

const addressSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  addressLine1: { type: String, required: true, trim: true },
  addressLine2: { type: String, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  postalCode: { type: String, required: true, trim: true },
  country: { type: String, default: 'India', trim: true },
  isDefault: { type: Boolean, default: false },
  addressType: {
    type: String,
    enum: ['HOME', 'WORK', 'WAREHOUSE'],
    default: 'HOME'
  }
}, { _id: true, timestamps: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    index: true
  },
  phone: {
    type: String,
    trim: true,
    index: true
  },
  dob: {
    type: Date,
    index: true
  },
  lastBirthdayRewardYear: {
    type: Number,
    default: 0,
    index: true
  },
  whatsappOptIn: {
    type: Boolean,
    default: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordOtp: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
  },
  role: {
    type: String,
    enum: Object.values(USER_ROLES),
    default: USER_ROLES.CUSTOMER,
    index: true
  },

  status: {
    type: String,
    enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'PENDING'],
    default: 'ACTIVE',
    index: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  provider: {
    type: String,
    enum: ['LOCAL', 'GOOGLE', 'APPLE'],
    default: 'LOCAL'
  },
  // B2B direct top-level fields
  b2bStatus: {
    type: String,
    enum: Object.values(B2B_STATUS),
    default: B2B_STATUS.NONE,
    index: true
  },
  businessName: {
    type: String,
    trim: true
  },
  businessType: {
    type: String,
    trim: true
  },
  gstNumber: {
    type: String,
    uppercase: true,
    trim: true,
    sparse: true,
    index: true
  },
  businessAddress: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: 'India', trim: true }
  },
  // Embedded b2bProfile for backward compatibility
  b2bProfile: {
    companyName: { type: String, trim: true },
    gstin: { type: String, uppercase: true, trim: true },
    pan: { type: String, uppercase: true, trim: true },
    businessType: { type: String, trim: true },
    businessAddress: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' }
    },
    verificationStatus: {
      type: String,
      enum: Object.values(B2B_STATUS),
      default: B2B_STATUS.NONE
    },
    verificationDate: Date,
    rejectionReason: String,
    documents: [String]
  },
  addresses: [addressSchema],
  wishlist: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual alias dateOfBirth
userSchema.virtual('dateOfBirth')
  .get(function () { return this.dob; })
  .set(function (v) { this.dob = v; });

// Sync top-level B2B fields with nested b2bProfile before saving
userSchema.pre('save', async function (next) {
  // Sync password hashing
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Bidirectional sync between b2bProfile and direct business fields
  if (this.b2bProfile) {
    if (this.b2bProfile.companyName && !this.businessName) this.businessName = this.b2bProfile.companyName;
    if (this.businessName && !this.b2bProfile.companyName) this.b2bProfile.companyName = this.businessName;
    if (this.b2bProfile.gstin && !this.gstNumber) this.gstNumber = this.b2bProfile.gstin;
    if (this.gstNumber && !this.b2bProfile.gstin) this.b2bProfile.gstin = this.gstNumber;
    if (this.b2bProfile.businessType && !this.businessType) this.businessType = this.b2bProfile.businessType;
    if (this.businessType && !this.b2bProfile.businessType) this.b2bProfile.businessType = this.businessType;
    if (this.b2bProfile.verificationStatus && this.b2bStatus === B2B_STATUS.NONE) {
      this.b2bStatus = this.b2bProfile.verificationStatus;
    }
  }

  next();
});

// Instance method to check password validity
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe profile view helper (omits password, internal hash)
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  return user;
};

module.exports = mongoose.model('User', userSchema);
