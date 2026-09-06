const User = require('../models/User');
const { verifyToken } = require('../utils/tokenUtils');
const { sendError } = require('../utils/responseHandler');
const { USER_ROLES, B2B_STATUS } = require('../config/constants');

/**
 * Strict authentication middleware (requireAuth / authenticateUser)
 */
const authenticateUser = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return sendError(
        res,
        'Authentication required. Please provide a valid Bearer token.',
        401,
        'UNAUTHENTICATED'
      );
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return sendError(res, 'User session is no longer active.', 401, 'UNAUTHENTICATED');
    }

    // Check account status (Suspended, Deactivated, or Inactive)
    if (user.status === 'SUSPENDED') {
      return sendError(
        res,
        'Your account has been suspended. Please contact customer support.',
        403,
        'ACCOUNT_SUSPENDED'
      );
    }

    if (user.status === 'DEACTIVATED' || !user.isActive) {
      return sendError(
        res,
        'Your account has been deactivated. Please contact support.',
        403,
        'ACCOUNT_DEACTIVATED'
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, 'Authentication token has expired. Please login again.', 401, 'UNAUTHENTICATED');
    }
    return sendError(res, 'Invalid authentication token.', 401, 'UNAUTHENTICATED');
  }
};

/**
 * Alias for authenticateUser
 */
const requireAuth = authenticateUser;

/**
 * Optional authentication middleware (populates req.user if present, but doesn't block guests)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive && user.status !== 'SUSPENDED') {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    // Silently continue for optional auth
    next();
  }
};

/**
 * Role authorization middleware (requireRole)
 * Supports multiple formats: requireRole("ADMIN"), requireRole("ADMIN", "B2B_WHOLESALER"), requireRole(["ADMIN"])
 */
const requireRole = (...roles) => {
  const allowedRoles = roles.flat();
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required.', 401, 'UNAUTHENTICATED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of these authorized roles: ${allowedRoles.join(', ')}`,
        403,
        'UNAUTHORIZED'
      );
    }

    next();
  };
};

/**
 * Alias for requireRole
 */
const authorizeRoles = requireRole;

/**
 * B2B Wholesale gate middleware
 * Requires approved B2B status (or ADMIN)
 */
const requireApprovedB2B = (req, res, next) => {
  if (!req.user) {
    return sendError(res, 'Authentication required.', 401, 'UNAUTHENTICATED');
  }

  // Admins always have access
  if (req.user.role === USER_ROLES.ADMIN) {
    return next();
  }

  if (req.user.role !== USER_ROLES.B2B_WHOLESALER) {
    return sendError(res, 'This feature is reserved for B2B Wholesale partners.', 403, 'UNAUTHORIZED');
  }

  const b2bStatus = req.user.b2bStatus || req.user.b2bProfile?.verificationStatus;
  if (b2bStatus !== B2B_STATUS.APPROVED) {
    return sendError(
      res,
      'Your B2B account is currently pending verification or not approved.',
      403,
      'B2B_NOT_APPROVED',
      { b2bStatus: b2bStatus || 'NONE' }
    );
  }

  next();
};

/**
 * Admin shorthand
 */
const requireAdmin = requireRole(USER_ROLES.ADMIN);

module.exports = {
  authenticateUser,
  requireAuth,
  optionalAuth,
  requireRole,
  authorizeRoles,
  requireApprovedB2B,
  requireAdmin
};
