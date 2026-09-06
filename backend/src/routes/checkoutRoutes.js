const express = require('express');
const router = express.Router();
const {
  getCheckoutSummary,
  placeOrder,
  getMyOrders,
  getOrderByNumber
} = require('../controllers/checkoutController');
const { requireAuth } = require('../middleware/authMiddleware');

// All checkout routes require authentication
router.use(requireAuth);

// Checkout flow
router.get('/summary', getCheckoutSummary);
router.post('/place-order', placeOrder);

// Order history
router.get('/orders', getMyOrders);
router.get('/orders/:orderNumber', getOrderByNumber);

module.exports = router;
