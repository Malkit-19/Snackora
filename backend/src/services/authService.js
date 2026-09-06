const User = require('../models/User');
const { generateToken } = require('../utils/tokenUtils');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');

/**
 * Service to handle customer registration
 */
const registerCustomer = async ({ name, email, password, phone }) => {
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    error.code = 'DUPLICATE_RESOURCE';
    throw error;
  }

  // Security invariant: Force CUSTOMER role
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone ? phone.trim() : '',
    role: USER_ROLES.CUSTOMER
  });

  const token = generateToken({
    id: user._id,
    role: user.role,
    b2bStatus: B2B_STATUS.NONE
  });

  return { user: user.toSafeObject(), token };
};

/**
 * Service to handle B2B registration
 */
const registerWholesaler = async ({
  name,
  email,
  password,
  phone,
  companyName,
  gstin,
  pan,
  businessType,
  businessAddress
}) => {
  const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
  if (existingUser) {
    const error = new Error('An account with this email address already exists.');
    error.statusCode = 409;
    error.code = 'DUPLICATE_RESOURCE';
    throw error;
  }

  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    phone: phone ? phone.trim() : '',
    role: USER_ROLES.B2B_WHOLESALER,
    b2bProfile: {
      companyName: companyName.trim(),
      gstin: gstin.toUpperCase().trim(),
      pan: pan ? pan.toUpperCase().trim() : '',
      businessType: businessType ? businessType.trim() : 'Retailer / Reseller',
      businessAddress: businessAddress || {},
      verificationStatus: B2B_STATUS.PENDING
    }
  });

  const token = generateToken({
    id: user._id,
    role: user.role,
    b2bStatus: B2B_STATUS.PENDING
  });

  return { user: user.toSafeObject(), token };
};

/**
 * Service to authenticate user login
 */
const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account is deactivated. Please contact support.');
    error.statusCode = 403;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    error.code = 'UNAUTHENTICATED';
    throw error;
  }

  const token = generateToken({
    id: user._id,
    role: user.role,
    b2bStatus: user.b2bProfile?.verificationStatus || B2B_STATUS.NONE
  });

  return { user: user.toSafeObject(), token };
};

module.exports = {
  registerCustomer,
  registerWholesaler,
  loginUser
};
