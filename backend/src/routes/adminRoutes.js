const express = require('express');
const router = express.Router();
const {
  getDashboardAnalytics,
  triggerBirthdayCheck,
  adminSendWhatsApp
} = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// All admin dashboard routes require authentication AND admin role
router.use(requireAuth);
router.use(requireAdmin);

router.get('/dashboard', getDashboardAnalytics);
router.get('/stats', getDashboardAnalytics);
router.post('/trigger-birthday-check', triggerBirthdayCheck);
router.post('/send-whatsapp', adminSendWhatsApp);

module.exports = router;

