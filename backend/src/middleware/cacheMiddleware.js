/**
 * Snackora — In-Memory API Performance Cache
 * ─────────────────────────────────────────────────────────────────────────────
 * High-speed in-memory response cache for read-heavy public endpoints:
 *   - Featured products & categories
 *   - Marketing banners & promotional ads
 * Provides sub-5ms response times while automatically invalidating on data mutations.
 */

const memoryCache = new Map();

/**
 * Cache middleware for Express GET routes.
 * @param {number} ttlSeconds - Time-to-live in seconds (default 60s)
 */
const cacheMiddleware = (ttlSeconds = 60) => {
  const ttlMs = ttlSeconds * 1000;

  return (req, res, next) => {
    // Only cache GET requests without authentication or with public scope
    if (req.method !== 'GET' || req.headers.authorization) {
      return next();
    }

    const cacheKey = req.originalUrl || req.url;
    const cachedEntry = memoryCache.get(cacheKey);

    if (cachedEntry) {
      const now = Date.now();
      if (now < cachedEntry.expiresAt) {
        // Cache Hit! Set performance header and return cached response
        res.setHeader('X-Snackora-Cache', 'HIT');
        res.setHeader('Cache-Control', `public, max-age=${Math.ceil((cachedEntry.expiresAt - now) / 1000)}`);
        return res.status(cachedEntry.status).json(cachedEntry.body);
      }
      // Expired
      memoryCache.delete(cacheKey);
    }

    // Cache Miss: intercept res.json to capture response payload
    const originalJson = res.json.bind(res);
    res.setHeader('X-Snackora-Cache', 'MISS');

    res.json = (body) => {
      // Only cache successful 200 responses
      if (res.statusCode === 200 && body && body.success !== false) {
        memoryCache.set(cacheKey, {
          status: res.statusCode,
          body,
          expiresAt: Date.now() + ttlMs
        });
      }
      return originalJson(body);
    };

    next();
  };
};

/**
 * Invalidate cache entries matching a given prefix or pattern.
 * @param {string} prefix - URL prefix to purge (e.g., '/api/products', '/api/categories')
 */
const invalidateCache = (prefix) => {
  if (!prefix) {
    memoryCache.clear();
    return;
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix) || key.includes(prefix)) {
      memoryCache.delete(key);
    }
  }
};

/**
 * Express middleware helper to automatically invalidate cache after mutation routes.
 */
const clearCacheOnMutation = (prefix) => {
  return (req, res, next) => {
    res.on('finish', () => {
      if ([200, 201, 204].includes(res.statusCode)) {
        invalidateCache(prefix);
      }
    });
    next();
  };
};

module.exports = {
  cacheMiddleware,
  invalidateCache,
  clearCacheOnMutation,
  getCacheSize: () => memoryCache.size
};
