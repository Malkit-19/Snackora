const AuditLog = require('../models/AuditLog');

/**
 * Log a sensitive administrative action into MongoDB AuditLog collection
 */
const createAuditLog = async ({
  req,
  user,
  action,
  resourceType,
  resourceId,
  changes = {}
}) => {
  try {
    const userId = user?._id || req?.user?._id;
    const ipAddress = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.headers['user-agent'] || 'Unknown';

    await AuditLog.create({
      user: userId,
      action,
      resourceType,
      resourceId: String(resourceId || ''),
      changes,
      ipAddress,
      userAgent
    });
  } catch (err) {
    console.warn('[AuditLog Warning] Failed to save audit log:', err.message);
  }
};

module.exports = {
  createAuditLog
};
