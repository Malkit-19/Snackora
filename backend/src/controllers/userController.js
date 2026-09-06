const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const { sendSuccess, sendError } = require('../utils/responseHandler');
const { createAuditLog } = require('../utils/auditLogger');

const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const VALID_ROLES = ['CUSTOMER', 'B2B_WHOLESALER', 'ADMIN'];

/**
 * Admin: List all registered users with search, filtering, and pagination.
 * Password / passwordHash is NEVER exposed.
 */
const adminGetAllUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const { role, status, search, b2bStatus } = req.query;

    const query = {};

    if (role && VALID_ROLES.includes(role.toUpperCase())) {
      query.role = role.toUpperCase();
    }
    if (status && VALID_STATUSES.includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }
    if (b2bStatus) {
      query.b2bStatus = b2bStatus.toUpperCase();
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { businessName: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -passwordHash -__v') // NEVER expose password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query)
    ]);

    // Aggregate summary
    const roleCounts = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const summary = {};
    roleCounts.forEach(({ _id, count }) => { summary[_id] = count; });

    return sendSuccess(res, 'Admin: user list retrieved successfully.', {
      users,
      roleSummary: summary,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalUsers: total,
        limit
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Get single user profile details and their order history.
 * Password / passwordHash is NEVER exposed.
 */
const adminGetUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password -passwordHash -__v');
    if (!user) {
      return sendError(res, 'User not found.', 404, 'NOT_FOUND');
    }

    const userOrders = await Order.find({ user: user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    return sendSuccess(res, 'Admin: user details retrieved.', {
      user,
      orderHistory: userOrders,
      ordersCount: userOrders.length
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Update permitted user profile information.
 * Password changes are NOT allowed through this endpoint.
 */
const adminUpdateUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select('-password -passwordHash');

    if (!user) {
      return sendError(res, 'User not found.', 404, 'NOT_FOUND');
    }

    const beforeState = user.toObject();
    const { name, phone, role, b2bStatus, businessName, businessType, gstNumber } = req.body;

    if (name && name.trim()) user.name = name.trim();
    if (phone && phone.trim()) user.phone = phone.trim();

    if (role && VALID_ROLES.includes(role.toUpperCase())) {
      user.role = role.toUpperCase();
    }
    if (b2bStatus) {
      user.b2bStatus = b2bStatus.toUpperCase();
      if (user.b2bProfile) user.b2bProfile.verificationStatus = b2bStatus.toUpperCase();
    }

    if (businessName !== undefined) user.businessName = businessName.trim();
    if (businessType !== undefined) user.businessType = businessType.trim();
    if (gstNumber !== undefined) user.gstNumber = gstNumber.trim().toUpperCase();

    await user.save();

    await createAuditLog({
      req,
      action: 'USER_PROFILE_UPDATE',
      resourceType: 'User',
      resourceId: user._id,
      changes: { before: beforeState, after: user.toObject() }
    });

    const updatedUser = await User.findById(id).select('-password -passwordHash');

    return sendSuccess(res, `User profile for '${user.name}' updated successfully.`, {
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Admin: Activate, Deactivate, or Suspend a user account.
 */
const adminUpdateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !VALID_STATUSES.includes(status.toUpperCase())) {
      return sendError(
        res,
        `Invalid status. Allowed values: ${VALID_STATUSES.join(', ')}.`,
        400,
        'VALIDATION_ERROR'
      );
    }

    const newStatus = status.toUpperCase();

    // Prevent admin from deactivating self
    if (id.toString() === req.user._id.toString() && newStatus !== 'ACTIVE') {
      return sendError(res, 'You cannot deactivate your own active admin account.', 400, 'SELF_DEACTIVATION_BLOCKED');
    }

    const user = await User.findById(id).select('-password -passwordHash');
    if (!user) {
      return sendError(res, 'User not found.', 404, 'NOT_FOUND');
    }

    const prevStatus = user.status;
    user.status = newStatus;
    await user.save();

    await createAuditLog({
      req,
      action: 'USER_STATUS_CHANGE',
      resourceType: 'User',
      resourceId: user._id,
      changes: {
        before: { status: prevStatus },
        after: { status: newStatus },
        reason: reason || ''
      }
    });

    return sendSuccess(res, `User '${user.name}' status set to ${newStatus}.`, {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  adminGetAllUsers,
  adminGetUserById,
  adminUpdateUserProfile,
  adminUpdateUserStatus
};
