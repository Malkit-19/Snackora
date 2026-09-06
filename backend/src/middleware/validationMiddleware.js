/**
 * Snackora — Input Validation Middleware
 * Centralizes common validation guards used across routes.
 */
const mongoose = require('mongoose');
const { sendError } = require('../utils/responseHandler');

/**
 * Validates that req.params.id is a valid MongoDB ObjectId.
 * Returns 400 INVALID_ID before the controller is reached.
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !mongoose.Types.ObjectId.isValid(value)) {
      return sendError(
        res,
        `Invalid ${paramName}. Must be a valid 24-character MongoDB ObjectId.`,
        400,
        'INVALID_ID'
      );
    }
    next();
  };
};

/**
 * Validates that a request body field is a valid HTTPS URL.
 * @param {string[]} fields - List of body field names to validate as URLs
 * @param {boolean} required - Whether the field is required
 */
const validateHttpsUrl = (fields = [], required = false) => {
  return (req, res, next) => {
    for (const field of fields) {
      const value = req.body[field];
      if (!value) {
        if (required) {
          return sendError(res, `${field} is required.`, 400, 'VALIDATION_ERROR');
        }
        continue;
      }

      if (typeof value !== 'string' || value.length > 2048) {
        return sendError(res, `${field} must be a valid URL string (max 2048 chars).`, 400, 'VALIDATION_ERROR');
      }

      try {
        const parsed = new URL(value);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return sendError(res, `${field} must use http or https protocol.`, 400, 'VALIDATION_ERROR');
        }
      } catch {
        return sendError(res, `${field} is not a valid URL.`, 400, 'VALIDATION_ERROR');
      }
    }
    next();
  };
};

/**
 * Sanitizes string fields in req.body to remove leading/trailing whitespace.
 * @param {string[]} fields - Body field names to trim
 */
const trimBodyFields = (fields = []) => {
  return (req, res, next) => {
    for (const field of fields) {
      if (req.body[field] && typeof req.body[field] === 'string') {
        req.body[field] = req.body[field].trim();
      }
    }
    next();
  };
};

module.exports = {
  validateObjectId,
  validateHttpsUrl,
  trimBodyFields
};
