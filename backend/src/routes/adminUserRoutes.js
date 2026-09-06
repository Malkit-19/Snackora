const express = require('express');
const router = express.Router();
const {
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUserProfile,
  adminUpdateUserStatus
} = require('../controllers/userController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// All Admin User routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get('/', adminGetAllUsers);
router.get('/:id', adminGetUserById);
router.put('/:id', adminUpdateUserProfile);
router.patch('/:id/status', adminUpdateUserStatus);

module.exports = router;
