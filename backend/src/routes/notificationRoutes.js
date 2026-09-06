const express = require('express');
const router = express.Router();
const {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getPushConfig,
  subscribePush,
  broadcastNotification,
  adminGetAllNotifications
} = require('../controllers/notificationController');
const { requireAuth, requireAdmin } = require('../middleware/authMiddleware');

// Public
router.get('/push-config', getPushConfig);

// Authenticated User Routes
router.get('/', requireAuth, getUserNotifications);
router.patch('/read-all', requireAuth, markAllNotificationsAsRead);
router.patch('/:id/read', requireAuth, markNotificationAsRead);
router.post('/subscribe-push', requireAuth, subscribePush);

// Admin Broadcast & Log Routes
router.post('/', requireAuth, requireAdmin, broadcastNotification);
router.get('/all', requireAuth, requireAdmin, adminGetAllNotifications);
router.get('/admin', requireAuth, requireAdmin, adminGetAllNotifications);

module.exports = router;

