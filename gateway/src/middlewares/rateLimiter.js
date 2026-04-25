const rateLimit = require('express-rate-limit');

// Custom handler for rate limit exceeded
const rateLimitHandler = (req, res, options) => {
  res.status(options.statusCode).json({
    message: options.message,
    retryAfter: req.rateLimit ? req.rateLimit.resetTime : null
  });
};

// Store rate limit data in memory (suitable for single/few gateway instances)
// For distributed deployments, upgrade to Redis store
const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    skip: (req) => {
      // Skip rate limiting for health checks or status endpoints
      return req.path === '/health' || req.path === '/status';
    },
  });
};

// Global API rate limiter (applies to all requests)
const globalLimiter = createRateLimiter(
  60 * 1000,          // 1 phút
  100,
  'Too many requests, please try again later.'
);

// Auth endpoints - stricter limits (chống brute force)
const authLimiter = createRateLimiter(
  15 * 60 * 1000,     // 15 phút
  5,                  // tối đa 5 lần
  'Too many authentication attempts. Please try again after 15 minutes.'
);

// Token refresh - moderate limits
const refreshLimiter = createRateLimiter(
  60 * 60 * 1000,     // 1 giờ
  20,
  'Too many refresh attempts. Please try again later.'
);

// Booking creation - tighter limit (expensive operation)
const bookingLimiter = createRateLimiter(
  60 * 1000,          // 1 phút
  10,
  'Too many booking requests. Please try again later.'
);

module.exports = {
  globalLimiter,
  authLimiter,
  refreshLimiter,
  bookingLimiter,
};
