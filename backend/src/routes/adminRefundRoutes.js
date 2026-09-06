const express = require('express');
const router = express.Router();
const {
  adminGetAllRefunds,
  adminUpdateRefundStatus,
  getRefundById
} = require('../controllers/refundController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// All Admin Refund routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', adminGetAllRefunds);
router.get('/:id', getRefundById);
router.patch('/:id', adminUpdateRefundStatus);

module.exports = router;
