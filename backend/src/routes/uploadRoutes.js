/**
 * Snackora — Upload Routes
 * POST /api/upload   — Admin-only image upload to Cloudinary
 */
const express = require('express');
const multer  = require('multer');
const { authenticateUser, requireRole } = require('../middleware/authMiddleware');
const { uploadImageToCloudinary } = require('../controllers/uploadController');

const router = express.Router();

// Multer in-memory storage (no disk writes — buffer sent directly to Cloudinary)
const storage = multer.memoryStorage();
const upload  = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },   // 8 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP and GIF images are allowed.'));
  }
});

// POST /api/upload  (single file OR base64 JSON body)
router.post(
  '/',
  authenticateUser,
  requireRole('ADMIN'),
  upload.single('image'),
  uploadImageToCloudinary
);

module.exports = router;
