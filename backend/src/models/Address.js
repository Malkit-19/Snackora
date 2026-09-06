const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  fullName: {
    type: String,
    trim: true,
    maxlength: [100, 'Full name cannot exceed 100 characters']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  addressLine1: {
    type: String,
    required: [true, 'Address line 1 is required'],
    trim: true
  },
  addressLine2: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true,
    index: true
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    trim: true,
    index: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Please provide a valid 6-digit pincode'],
    index: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    default: 'India',
    trim: true
  },
  label: {
    type: String,
    enum: ['Home', 'Office', 'Other', 'HOME', 'OFFICE', 'WORK', 'WAREHOUSE', 'OTHER'],
    default: 'Home'
  },
  addressType: {
    type: String,
    enum: ['Home', 'Office', 'Other', 'HOME', 'OFFICE', 'WORK', 'WAREHOUSE', 'OTHER'],
    default: 'Home'
  },
  isDefault: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Pre-save synchronization for aliases & default address logic
addressSchema.pre('save', async function (next) {
  // Sync name & fullName
  if (this.fullName && !this.name) this.name = this.fullName;
  if (this.name && !this.fullName) this.fullName = this.name;

  // Sync pincode & postalCode
  if (this.pincode && !this.postalCode) this.postalCode = this.pincode;
  if (this.postalCode && !this.pincode) this.pincode = this.postalCode;

  // Sync label & addressType
  if (this.label && !this.addressType) this.addressType = this.label;
  if (this.addressType && !this.label) this.label = this.addressType;

  // If this address is set as default, unset default on other addresses of this user
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }

  next();
});

module.exports = mongoose.model('Address', addressSchema);
