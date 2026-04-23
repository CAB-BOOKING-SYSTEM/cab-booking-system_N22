// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../core/redis.js';

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    }),
    windowMs,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
  });
};

// Rate limit cho Login (chống brute force)
export const loginLimiter = createRateLimiter(
  15 * 60 * 1000,     // 15 phút
  5,                  // tối đa 5 lần
  'Too many login attempts. Please try again after 15 minutes.'
);

// Rate limit cho Refresh Token
export const refreshLimiter = createRateLimiter(
  60 * 60 * 1000,     // 1 giờ
  20,
  'Too many refresh attempts.'
);

// Rate limit chung
export const apiLimiter = createRateLimiter(
  60 * 1000,          // 1 phút
  100,
  'Too many requests, please try again later.'
);