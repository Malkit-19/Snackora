const express = require('express');
const router = express.Router();
const {
  applyB2B,
  getB2BStatus,
  getB2BDashboard,
  createB2BRequest,
  getMyB2BRequests
} = require('../controllers/b2bController');
const { requireAuth, requireApprovedB2B } = require('../middleware/authMiddleware');

// All B2B user routes require authentication
router.use(requireAuth);

// Applications & Status
router.post('/apply', applyB2B);
router.get('/status', getB2BStatus);

// Approved Wholesaler Portal
router.get('/dashboard', requireApprovedB2B, getB2BDashboard);

// Business Requests / Quotes
router.post('/requests', requireApprovedB2B, createB2BRequest);
router.get('/requests', requireApprovedB2B, getMyB2BRequests);

module.exports = router;
