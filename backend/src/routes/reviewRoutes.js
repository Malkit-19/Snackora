const express = require('express');
const router = express.Router();
const {
  updateReview,
  deleteReview,
  adminGetAllReviews
} = require('../controllers/reviewController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public / Admin review fetching
router.get('/', adminGetAllReviews);
router.get('/admin', requireAuth, requireAdmin, adminGetAllReviews);

// Review management endpoints require authentication
router.use(requireAuth);

router.put('/:id', updateReview);
router.delete('/:id', deleteReview);

module.exports = router;

