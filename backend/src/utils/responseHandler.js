/**
 * Standard API Response Formatters for Snackora
 *
 * Success Format:
 * {
 *   success: true,
 *   data: {},
 *   message: ""
 * }
 *
 * Error Format:
 * {
 *   success: false,
 *   message: "",
 *   code: ""
 * }
 */

const sendSuccess = (res, message = 'Success', data = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data: data !== null && data !== undefined ? data : {},
    message
  });
};

const sendError = (res, message = 'Internal Server Error', statusCode = 500, code = 'INTERNAL_ERROR', extra = null) => {
  const response = {
    success: false,
    message,
    code: code || 'ERROR'
  };

  // Only include validation details or extra non-sensitive debug if present
  if (extra && process.env.NODE_ENV !== 'production') {
    response.details = extra;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError
};
