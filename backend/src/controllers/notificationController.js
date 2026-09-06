const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSuccess, sendError } = require('../utils/responseHandler');

/**
 * Helper: Create in-app notification safely
 */
const createInAppNotification = async ({
  userId,
  type = 'SYSTEM',
  title,
  message,
  link = '',
  metadata = {}
}) => {
  try {
    return await Notification.create({
      user: userId,
      type: type.toUpperCase(),
      title,
      message,
      link,
      metadata,
      read: false
    });
  } catch (err) {
    console.warn('[Notification Warning] Failed to create in-app notification:', err.message);
    return null;
  }
};

/**
 * GET /api/notifications
 * Get authenticated user's notifications with unread count and pagination
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const skip = (page - 1) * limit;

    const { type, read } = req.query;

    const query = { user: req.user._id };

    if (type) {
      query.type = type.toUpperCase();
    }
    if (read !== undefined) {
      query.read = read === 'true';
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: req.user._id, read: false })
    ]);

    return sendSuccess(res, 'Notifications retrieved.', {
      notifications,
      unreadCount,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalNotifications: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a single notification as read
 */
const markNotificationAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      _id: id,
      user: req.user._id
    });

    if (!notification) {
      return sendError(res, 'Notification not found.', 404, 'NOT_FOUND');
    }

    notification.read = true;
    notification.readAt = new Date();
    await notification.save();

    const remainingUnread = await Notification.countDocuments({ user: req.user._id, read: false });

    return sendSuccess(res, 'Notification marked as read.', {
      notification,
      unreadCount: remainingUnread
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return sendSuccess(res, 'All notifications marked as read.', {
      markedCount: result.modifiedCount,
      unreadCount: 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/push-config
 * Public/Safe: Returns browser push notification configuration
 */
const getPushConfig = async (req, res) => {
  return sendSuccess(res, 'Web push configuration.', {
    enabled: Boolean(process.env.VAPID_PUBLIC_KEY),
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY || null,
    message: 'Browser notifications prepared. Permission requested only when user opts in.'
  });
};

/**
 * POST /api/notifications/subscribe-push
 * Save user's browser push subscription safely
 */
const subscribePush = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return sendError(res, 'Valid push subscription object is required.', 400, 'VALIDATION_ERROR');
    }

    // Save subscription in user profile
    await User.findByIdAndUpdate(req.user._id, {
      $set: { 'pushSubscription': subscription }
    });

    return sendSuccess(res, 'Push subscription saved successfully.', { subscribed: true });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications & /api/v1/notifications
 * Admin: Broadcast a notification to all active users or a specific role
 */

const broadcastNotification = async (req, res, next) => {
  try {
    const { title, message, type = 'SYSTEM', targetRole } = req.body;
    if (!title || !message) {
      return sendError(res, 'Title and message are required.', 400, 'VALIDATION_ERROR');
    }

    let userQuery = { isActive: true };
    if (targetRole && targetRole !== 'ALL') {
      userQuery.role = targetRole;
    }

    const users = await User.find(userQuery).select('_id');
    const notifications = users.map((u) => ({
      user: u._id,
      type: (type || 'SYSTEM').toUpperCase(),
      title: title.trim(),
      message: message.trim(),
      read: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return sendSuccess(res, `Notification broadcast delivered to ${users.length} users.`, {
      recipientCount: users.length
    }, 201);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/all & /api/v1/notifications/all
 * Admin: Fetch global notification logs
 */
const adminGetAllNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const notifications = await Notification.find()
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit);

    return sendSuccess(res, 'Notifications retrieved.', { notifications });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createInAppNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getPushConfig,
  subscribePush,
  broadcastNotification,
  adminGetAllNotifications
};

