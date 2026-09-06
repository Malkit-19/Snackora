const express = require('express');
const router = express.Router();
const {
  adminGetAllOrders,
  adminUpdateOrderStatus,
  adminGetOrderById
} = require('../controllers/orderController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// All admin order routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', adminGetAllOrders);
router.get('/:id', adminGetOrderById);
router.patch('/:id/status', adminUpdateOrderStatus);

module.exports = router;
