// middleware/rateLimiter.js
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../core/redis.js';

const createRateLimiter = (windowMs, max, message, prefix) => {
  return rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix,
    }),
    windowMs,
    max,
    message: { message },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || req.headers['x-forwarded-for'] || 'unknown',
    passOnStoreError: true,
  });
};

export const loginLimiter = createRateLimiter(
  15 * 60 * 1000, 5,
  'Too many login attempts. Please try again after 15 minutes.',
  'rl:login:'                                                      // ← unique prefix
);

export const refreshLimiter = createRateLimiter(
  60 * 60 * 1000, 20,
  'Too many refresh attempts.',
  'rl:refresh:'                                                    // ← unique prefix
);

export const apiLimiter = createRateLimiter(
  60 * 1000, 100,
  'Too many requests, please try again later.',
  'rl:api:'                                                        // ← unique prefix
);