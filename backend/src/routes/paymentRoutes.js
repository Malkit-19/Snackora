const express = require('express');
const router = express.Router();
const {
  getPaymentConfig,
  createRazorpayOrder,
  verifyPayment,
  handleWebhook,
  getPaymentByOrder,
  verifyDirectUpiPayment
} = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/authMiddleware');

// ── PUBLIC ──────────────────────────────────────────────────────────────────
// Returns only the public key_id — NEVER the secret
router.get('/config', getPaymentConfig);

// ── WEBHOOK ─────────────────────────────────────────────────────────────────
// MUST be raw body (not JSON-parsed) for HMAC-SHA256 signature verification.
// express.raw() is applied only to this route.
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleWebhook
);

// ── AUTHENTICATED USER ROUTES ────────────────────────────────────────────────
router.post('/create-razorpay-order', requireAuth, createRazorpayOrder);
router.post('/verify', requireAuth, verifyPayment);
router.post('/verify-direct-upi', requireAuth, verifyDirectUpiPayment);
router.get('/order/:orderId', requireAuth, getPaymentByOrder);

module.exports = router;
