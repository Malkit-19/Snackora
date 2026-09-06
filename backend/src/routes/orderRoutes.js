const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById
} = require('../controllers/orderController');
const { getOrderTracking } = require('../controllers/deliveryController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');

// All order routes require authentication
router.use(requireAuth);

// User order routes — ownership strictly enforced in controller
router.post('/', createOrder);
router.get('/', getMyOrders);
router.get('/:id', validateObjectId(), getOrderById);
router.get('/:id/tracking', validateObjectId(), getOrderTracking);

module.exports = router;
