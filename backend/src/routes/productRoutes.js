const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');
const { optionalAuth, requireAuth, requireAdmin } = require('../middleware/authMiddleware');
const { validateObjectId } = require('../middleware/validationMiddleware');
const {
  createProductReview,
  getProductReviews
} = require('../controllers/reviewController');

// Public Product Endpoints
router.get('/featured', optionalAuth, getFeaturedProducts);
router.get('/slug/:slug', optionalAuth, getProductBySlug);
router.get('/', optionalAuth, getAllProducts);
router.get('/:id', optionalAuth, getProductById); // getProductById handles both 24-char ObjectId and URL slugs

// Reviews for Product
router.get('/:id/reviews', optionalAuth, validateObjectId(), getProductReviews);
router.post('/:id/reviews', requireAuth, validateObjectId(), createProductReview);


// Admin-Only Product Management Endpoints
router.post('/', requireAuth, requireAdmin, createProduct);
router.put('/:id', requireAuth, requireAdmin, validateObjectId(), updateProduct);
router.delete('/:id', requireAuth, requireAdmin, validateObjectId(), deleteProduct);

module.exports = router;
