const { sendError } = require('../utils/responseHandler');

/**
 * 404 Catch-All Middleware
 */
const notFound = (req, res, next) => {
  return sendError(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404, 'NOT_FOUND');
};

/**
 * Centralized Global Error Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const extractedMessage = err.message || err.error?.description || err.description || 'An error occurred';
  // Only log detailed stack traces in non-production environments
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Global Error Handler] ${err.name || 'Error'}: ${extractedMessage}`, err.stack || err);
  } else {
    console.error(`[Global Error Handler] ${err.name || 'Error'}: ${extractedMessage}`);
  }


  // 1. Mongoose Bad ObjectId (CastError) -> invalid ID
  if (err.name === 'CastError') {
    return sendError(
      res,
      `Invalid resource identifier format: '${err.value}'`,
      400,
      'INVALID_ID'
    );
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return sendError(
      res,
      `A record with this ${field} already exists in the system.`,
      409,
      'DUPLICATE_RESOURCE'
    );
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(
      res,
      messages.join(', ') || 'Validation failed on submitted payload.',
      422,
      'VALIDATION_ERROR',
      messages
    );
  }

  // 4. JWT Authentication Errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Authentication failed: Invalid token.', 401, 'UNAUTHENTICATED');
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Authentication failed: Token has expired.', 401, 'UNAUTHENTICATED');
  }

  // 5. Explicit Custom Authorization Errors
  if (err.statusCode === 403 || err.code === 'UNAUTHORIZED' || err.name === 'UnauthorizedError') {
    return sendError(
      res,
      err.message || 'You do not have permission to perform this action.',
      403,
      'UNAUTHORIZED'
    );
  }

  // 6. Explicit 404 Errors thrown in controllers
  if (err.statusCode === 404 || err.code === 'NOT_FOUND') {
    return sendError(res, err.message || 'Requested resource was not found.', 404, 'NOT_FOUND');
  }

  // 7. General Custom Status or 500 Unexpected Errors
  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred on the server. Please try again later.'
      : err.message || err.error?.description || err.description || 'An unexpected server error occurred.';


  const code = err.code && typeof err.code === 'string' ? err.code : 'INTERNAL_ERROR';

  return sendError(res, message, statusCode, code);
};

module.exports = {
  notFound,
  errorHandler
};
