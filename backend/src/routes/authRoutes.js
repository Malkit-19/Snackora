const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/authController');
const { requireAuth } = require('../middleware/authMiddleware');

// Public Auth Endpoints
router.post('/register', register);
router.post('/register-b2b', registerB2B);
router.post('/login', login);
router.post('/logout', logout);

// Password Recovery & Reset Endpoints
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// OAuth Endpoints (Server-side architecture)
router.post('/oauth/google', googleOAuth);
router.post('/oauth/apple', appleOAuth);

// Authenticated User Endpoints
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

module.exports = router;

