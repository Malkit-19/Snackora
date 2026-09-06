/**
 * Snackora — Native MongoDB Injection Sanitizer Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Recursively sanitizes user input in `req.body`, `req.params`, and query objects
 * by stripping keys with MongoDB query selector operators (starting with '$' or containing '.')
 * Compatible with both Express 4.x and Express 5.x (avoids reassigning read-only getters).
 */

const sanitizeObject = (target, replaceWith = '_') => {
  if (!target || typeof target !== 'object') return target;

  if (Array.isArray(target)) {
    return target.map((item) => sanitizeObject(item, replaceWith));
  }

  const clean = {};
  for (const [key, value] of Object.entries(target)) {
    let safeKey = key;
    if (key.startsWith('$') || key.includes('.')) {
      safeKey = key.replace(/^\$/, replaceWith).replace(/\./g, replaceWith);
      console.warn(`[Security] MongoDB injection vector sanitized in key: "${key}" -> "${safeKey}"`);
    }

    if (value !== null && typeof value === 'object') {
      clean[safeKey] = sanitizeObject(value, replaceWith);
    } else {
      clean[safeKey] = value;
    }
  }

  return clean;
};

const mongoSanitizeMiddleware = (options = {}) => {
  const replaceWith = options.replaceWith || '_';

  return (req, res, next) => {
    // Sanitize req.body in-place
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        if (key.startsWith('$') || key.includes('.')) {
          const safeKey = key.replace(/^\$/, replaceWith).replace(/\./g, replaceWith);
          req.body[safeKey] = sanitizeObject(req.body[key], replaceWith);
          delete req.body[key];
        } else if (typeof req.body[key] === 'object') {
          req.body[key] = sanitizeObject(req.body[key], replaceWith);
        }
      }
    }

    // Sanitize req.params in-place
    if (req.params && typeof req.params === 'object') {
      for (const key of Object.keys(req.params)) {
        if (typeof req.params[key] === 'object') {
          req.params[key] = sanitizeObject(req.params[key], replaceWith);
        }
      }
    }

    next();
  };
};

module.exports = {
  mongoSanitizeMiddleware,
  sanitizeObject
};
