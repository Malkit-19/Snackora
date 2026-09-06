const User = require('../models/User');
const B2BApplication = require('../models/B2BApplication');
const Ad = require('../models/Ad');
const whatsappService = require('../services/whatsappService');
const { createInAppNotification } = require('./notificationController');
const { generateToken } = require('../utils/tokenUtils');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');
const { sendPasswordResetEmail } = require('../services/emailService');
const validator = require('validator');
const crypto = require('crypto');


/**
 * Public User Registration
 * Allowed roles: CUSTOMER, B2B_WHOLESALER
 * Strictly prevents ADMIN creation through public signup
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, dob, dateOfBirth, whatsappOptIn, role } = req.body;

    if (!name || !email || !password) {
      return sendError(res, 'Name, email, and password are required fields.', 400, 'VALIDATION_ERROR');
    }

    if (!validator.isEmail(String(email).trim())) {
      return sendError(res, 'Please provide a valid email address.', 400, 'VALIDATION_ERROR');
    }

    if (String(password).length < 6) {
      return sendError(res, 'Password must be at least 6 characters.', 400, 'VALIDATION_ERROR');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendError(res, 'An account with this email address already exists.', 409, 'DUPLICATE_RESOURCE');
    }

    // Security Invariant: Public signup can ONLY create CUSTOMER or B2B_WHOLESALER.
    // If ADMIN is requested or any unauthorized value, reject or fallback to CUSTOMER.
    let assignedRole = USER_ROLES.CUSTOMER;
    let b2bStatus = B2B_STATUS.NONE;

    if (role === USER_ROLES.B2B_WHOLESALER) {
      assignedRole = USER_ROLES.B2B_WHOLESALER;
      b2bStatus = B2B_STATUS.PENDING;
    }

    const parsedDob = dob || dateOfBirth ? new Date(dob || dateOfBirth) : null;

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : '',
      dob: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null,
      whatsappOptIn: whatsappOptIn !== undefined ? Boolean(whatsappOptIn) : true,
      role: assignedRole,
      b2bStatus,
      status: 'ACTIVE',
      isActive: true,
      provider: 'LOCAL'
    });


    const token = generateToken({
      id: user._id,
      role: user.role,
      b2bStatus: user.b2bStatus
    });

    // Real-Time WhatsApp Welcome Broadcast & In-App Notification
    if (user.phone && user.whatsappOptIn !== false) {
      (async () => {
        try {
          const activeAd = await Ad.findOne({ isActive: true, placement: 'HOMEPAGE' }).lean();
          await whatsappService.sendWelcomeBroadcast({
            to: user.phone,
            userName: user.name,
            isB2B: user.role === USER_ROLES.B2B_WHOLESALER,
            couponCode: 'WELCOME10',
            activeAd
          });
          await createInAppNotification({
            userId: user._id,
            type: 'PROMOTION',
            title: '🎉 Welcome to Snackora!',
            message: 'Enjoy 10% off your first gourmet snack order with coupon code WELCOME10.',
            link: '/shop',
            metadata: { couponCode: 'WELCOME10' }
          });
        } catch (err) {
          console.warn('[Welcome Notification Warning]:', err.message);
        }
      })();
    }

    return sendSuccess(res, 'Registration successful! Welcome to Snackora.', {
      user: user.toSafeObject(),
      token
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * B2B Wholesale Application / Registration with business profile
 */
const registerB2B = async (req, res, next) => {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;
    const phone = req.body.phone;
    const dob = req.body.dob || req.body.dateOfBirth;
    const whatsappOptIn = req.body.whatsappOptIn;
    const companyName = req.body.companyName || req.body.b2bProfile?.companyName;
    const gstin = req.body.gstin || req.body.b2bProfile?.gstin;
    const pan = req.body.pan || req.body.b2bProfile?.pan;
    const businessType = req.body.businessType || req.body.b2bProfile?.businessType;
    const businessAddress = req.body.businessAddress || req.body.b2bProfile?.businessAddress;

    if (!name || !email || !password || !companyName || !gstin) {
      return sendError(
        res,
        'Name, email, password, company name, and GSTIN are mandatory for B2B registration.',
        400,
        'VALIDATION_ERROR'
      );
    }

    if (!validator.isEmail(String(email).trim())) {
      return sendError(res, 'Please provide a valid email address.', 400, 'VALIDATION_ERROR');
    }

    if (String(password).length < 6) {
      return sendError(res, 'Password must be at least 6 characters.', 400, 'VALIDATION_ERROR');
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return sendError(res, 'An account with this email address already exists.', 409, 'DUPLICATE_RESOURCE');
    }

    const parsedDob = dob ? new Date(dob) : null;

    // Create user with B2B_WHOLESALER role and PENDING verification status
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : '',
      dob: parsedDob && !isNaN(parsedDob.getTime()) ? parsedDob : null,
      whatsappOptIn: whatsappOptIn !== undefined ? Boolean(whatsappOptIn) : true,
      role: USER_ROLES.B2B_WHOLESALER,
      b2bStatus: B2B_STATUS.PENDING,
      businessName: companyName.trim(),
      businessType: businessType ? businessType.trim() : 'Retailer / Reseller',
      gstNumber: gstin.toUpperCase().trim(),
      businessAddress: businessAddress || {},
      status: 'ACTIVE',
      isActive: true,
      b2bProfile: {
        companyName: companyName.trim(),
        gstin: gstin.toUpperCase().trim(),
        pan: pan ? pan.toUpperCase().trim() : '',
        businessType: businessType ? businessType.trim() : 'Retailer / Reseller',
        businessAddress: businessAddress || {},
        verificationStatus: B2B_STATUS.PENDING
      }
    });


    // Also create official B2BApplication record so admin immediately sees it
    try {
      await B2BApplication.create({
        user: user._id,
        companyName: companyName.trim(),
        ownerName: name.trim(),
        businessType: businessType ? businessType.trim() : 'Retailer / Reseller',
        gstin: gstin.toUpperCase().trim(),
        phone: phone ? phone.trim() : '',
        email: email.toLowerCase().trim(),
        businessAddress: businessAddress || {},
        expectedMonthlyOrder: req.body.expectedMonthlyOrder || 'Under ₹25,000 / month',
        productsInterested: req.body.productsInterested || ['All Categories'],
        status: 'PENDING'
      });
    } catch (appErr) {
      console.warn('[B2B Registration Warning] Could not create separate B2BApplication doc:', appErr.message);
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      b2bStatus: B2B_STATUS.PENDING
    });

    // Real-Time WhatsApp B2B Welcome Broadcast & In-App Notification
    if (user.phone && user.whatsappOptIn !== false) {
      (async () => {
        try {
          await whatsappService.sendWelcomeBroadcast({
            to: user.phone,
            userName: user.name,
            isB2B: true
          });
          await createInAppNotification({
            userId: user._id,
            type: 'B2B',
            title: '🏢 B2B Wholesale Application Submitted',
            message: 'Your B2B account application is under review by the Snackora team.',
            link: '/dashboard',
            metadata: { gstin: user.gstNumber }
          });
        } catch (err) {
          console.warn('[B2B Welcome Notification Warning]:', err.message);
        }
      })();
    }

    return sendSuccess(
      res,
      'B2B application submitted successfully! Our team will review your business credentials within 24 hours.',
      {
        user: user.toSafeObject(),
        token
      },
      201
    );
  } catch (error) {
    next(error);
  }
};

/**
 * User Login (Customer, B2B, or Admin)
 * Server-side bcrypt hash comparison & status verification
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return sendError(res, 'Please provide valid string values for email and password.', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return sendError(res, 'Invalid email or password.', 401, 'UNAUTHENTICATED');
    }

    // Check account active / suspension status
    if (user.status === 'SUSPENDED') {
      return sendError(
        res,
        'Your account has been suspended. Please contact customer support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    if (user.status === 'DEACTIVATED' || !user.isActive) {
      return sendError(
        res,
        'Your account has been deactivated. Please contact support.',
        403,
        'ACCOUNT_DEACTIVATED'
      );
    }

    // Server-side bcrypt hash comparison
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return sendError(res, 'Invalid email or password.', 401, 'UNAUTHENTICATED');
    }

    const token = generateToken({
      id: user._id,
      role: user.role,
      b2bStatus: user.b2bStatus || user.b2bProfile?.verificationStatus || B2B_STATUS.NONE
    });

    return sendSuccess(res, 'Login successful.', {
      user: user.toSafeObject(),
      token
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fetch Current Authenticated User Profile
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return sendError(res, 'User session not found.', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, 'User profile fetched successfully.', { user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};

/**
 * Update User Profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, dob, dateOfBirth, whatsappOptIn, addresses } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return sendError(res, 'User not found.', 404, 'NOT_FOUND');
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (dob || dateOfBirth) {
      const parsed = new Date(dob || dateOfBirth);
      if (!isNaN(parsed.getTime())) user.dob = parsed;
    }
    if (whatsappOptIn !== undefined) {
      user.whatsappOptIn = Boolean(whatsappOptIn);
    }
    if (addresses && Array.isArray(addresses)) {
      user.addresses = addresses;
    }

    await user.save();
    return sendSuccess(res, 'Profile updated successfully.', { user: user.toSafeObject() });
  } catch (error) {
    next(error);
  }
};


/**
 * OAuth Architecture: Google OAuth
 */
const googleOAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return sendError(res, 'Google idToken is required.', 400, 'VALIDATION_ERROR');
    }

    // In a full implementation, verify idToken with Google Auth Library (secrets remain server-side in process.env)
    return sendSuccess(res, 'Google OAuth endpoint prepared. Ready for client ID and secret binding.', {
      provider: 'GOOGLE',
      status: 'PREPARED'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * OAuth Architecture: Apple OAuth
 */
const appleOAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return sendError(res, 'Apple idToken is required.', 400, 'VALIDATION_ERROR');
    }

    // In a full implementation, verify idToken with Apple public keys (secrets remain server-side in process.env)
    return sendSuccess(res, 'Apple OAuth endpoint prepared. Ready for client secret binding.', {
      provider: 'APPLE',
      status: 'PREPARED'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Secure Logout
 */
const logout = async (req, res) => {
  // Clear any auth cookies if used, and confirm token invalidation client-side
  return sendSuccess(res, 'Logged out successfully.', {});
};

/**
 * ── PASSWORD RECOVERY ENGINE ──────────────────────────────────────────────
 */

/**
 * 1. Request Password Reset (Dispatches 6-digit OTP & 1-Click Link to Real Email)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !validator.isEmail(String(email).trim())) {
      return sendError(res, 'Please provide a valid email address.', 400, 'VALIDATION_ERROR');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // Prevent user enumeration attacks by returning consistent success message
      return sendSuccess(res, 'If an account with that email exists, a verification code and reset link have been sent.', {
        email: email.toLowerCase().trim()
      });
    }

    // Generate secure 6-digit numeric OTP code
    const rawOtp = String(Math.floor(100000 + crypto.randomInt(0, 900000)));
    // Generate secure URL token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // Hash with SHA-256 for secure DB persistence
    user.resetPasswordOtp = crypto.createHash('sha256').update(rawOtp).digest('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

    await user.save({ validateBeforeSave: false });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    // Dispatch real email via Nodemailer
    const emailResult = await sendPasswordResetEmail({
      user,
      otp: rawOtp,
      resetUrl
    });

    return sendSuccess(res, 'Verification code and password reset link sent to your email.', {
      email: user.email,
      expiresInMinutes: 15,
      emailDispatched: emailResult.success
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 2. Verify Reset Code / OTP or Token
 */
const verifyResetCode = async (req, res, next) => {
  try {
    const { email, otp, token } = req.body;

    let user = null;

    if (token) {
      const hashedToken = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: new Date() }
      }).select('+resetPasswordOtp +resetPasswordToken +resetPasswordExpire');
    } else if (email && otp) {
      const hashedOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
      user = await User.findOne({
        email: String(email).toLowerCase().trim(),
        resetPasswordOtp: hashedOtp,
        resetPasswordExpire: { $gt: new Date() }
      }).select('+resetPasswordOtp +resetPasswordToken +resetPasswordExpire');
    } else if (email) {
      user = await User.findOne({
        email: String(email).toLowerCase().trim(),
        resetPasswordExpire: { $gt: new Date() }
      }).select('+resetPasswordOtp +resetPasswordToken +resetPasswordExpire');
    }

    if (!user) {
      return sendError(res, 'Invalid or expired verification code / link. Please request a new one.', 400, 'INVALID_RESET_CODE');
    }

    return sendSuccess(res, 'Verification successful. You can now set your new password.', {
      valid: true,
      email: user.email
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 3. Set New Password (Replaces Old Password in MongoDB with bcrypt hash)
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, token, password, newPassword } = req.body;
    const targetPassword = password || newPassword;

    if (!targetPassword || String(targetPassword).length < 6) {
      return sendError(res, 'New password must be at least 6 characters.', 400, 'VALIDATION_ERROR');
    }

    let user = null;

    if (token) {
      const hashedToken = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: new Date() }
      }).select('+password +resetPasswordOtp +resetPasswordToken +resetPasswordExpire');
    } else if (email && otp) {
      const hashedOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');
      user = await User.findOne({
        email: String(email).toLowerCase().trim(),
        resetPasswordOtp: hashedOtp,
        resetPasswordExpire: { $gt: new Date() }
      }).select('+password +resetPasswordOtp +resetPasswordToken +resetPasswordExpire');
    }

    if (!user) {
      return sendError(res, 'Invalid or expired verification code / reset link. Please request a new code.', 400, 'INVALID_RESET_CODE');
    }

    // Set new password (pre-save hook will bcrypt hash it and permanently replace old password)
    user.password = targetPassword;
    user.resetPasswordOtp = undefined;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    // Issue fresh authentication JWT token
    const jwtToken = generateToken({
      id: user._id,
      role: user.role,
      b2bStatus: user.b2bStatus || user.b2bProfile?.verificationStatus || B2B_STATUS.NONE
    });

    return sendSuccess(res, 'Password reset successful! You can now log in with your new password.', {
      user: user.toSafeObject(),
      token: jwtToken
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  registerB2B,
  login,
  getMe,
  updateProfile,
  googleOAuth,
  appleOAuth,
  logout,
  forgotPassword,
  verifyResetCode,
  resetPassword
};

