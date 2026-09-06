const express = require('express');
const router = express.Router();
const {
  getAllCategories,
  getCategoryBySlug,
  adminGetAllCategories,
  createCategory,
  updateCategory,
  toggleCategoryStatus,
  deleteCategory
} = require('../controllers/categoryController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public routes
router.get('/', getAllCategories);
router.get('/admin/all', requireAuth, requireAdmin, adminGetAllCategories);
router.get('/:slug', getCategoryBySlug);

// Admin CRUD routes
router.post('/', requireAuth, requireAdmin, createCategory);
router.put('/:id', requireAuth, requireAdmin, updateCategory);
router.patch('/:id/status', requireAuth, requireAdmin, toggleCategoryStatus);
router.delete('/:id', requireAuth, requireAdmin, deleteCategory);

module.exports = router;
