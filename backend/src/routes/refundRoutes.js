const express = require('express');
const router = express.Router();
const {
  createRefundRequest,
  getCustomerRefunds,
  getRefundById
} = require('../controllers/refundController');
const { requireAuth } = require('../middleware/authMiddleware');
const { validateBase64Images } = require('../middleware/uploadMiddleware');

// All customer refund routes require authentication
router.use(requireAuth);

router.post('/', validateBase64Images('images', 3), createRefundRequest);
router.get('/', getCustomerRefunds);
router.get('/:id', getRefundById);

module.exports = router;
