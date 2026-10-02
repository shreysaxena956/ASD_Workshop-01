// Simple in-memory cache using Map
const cache = new Map();
const TTL = 60 * 1000; // 1 minute in milliseconds

// Cache middleware for GET requests
function cacheMiddleware(req, res, next) {
  const key = req.originalUrl || req.url;
  const cachedEntry = cache.get(key);

  if (cachedEntry) {
    const isExpired = Date.now() - cachedEntry.createdAt >= TTL;
    if (!isExpired) {
      // Cache HIT: return cached data immediately
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedEntry.data);
    }
    // Expired: delete stale entry from cache
    cache.delete(key);
  }

  // Cache MISS: set header and continue to controller
  res.setHeader('X-Cache', 'MISS');
  next();
}

// Store data in cache with creation timestamp
function setCache(key, data) {
  cache.set(key, {
    data: data,
    createdAt: Date.now()
  });
}

// Clear all cache entries on data modification
function clearCache() {
  cache.clear();
}

module.exports = {
  cacheMiddleware,
  setCache,
  clearCache,
  cache,
  TTL
};
