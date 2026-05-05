const rateLimit = require('express-rate-limit');

// ─── Pricing Rate Limiter (express-rate-limit) ───────────────────────────────
// Đọc giới hạn từ biến môi trường:
//   PRICING_RATE_LIMIT=15        → production (15 req/phút/IP)
//   PRICING_RATE_LIMIT=10000     → load test (không bị chặn)
// Mặc định 10000 nếu không set (phù hợp môi trường dev/test)
const PRICING_RATE_LIMIT = parseInt(process.env.PRICING_RATE_LIMIT) || 10000;

const pricingRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,  // 1 phút
  max: PRICING_RATE_LIMIT,
  message: {
    success: false,
    message: 'Bạn đã thực hiện quá nhiều yêu cầu tính toán. Vui lòng thử lại sau 1 phút.'
  },
  standardHeaders: true,   // Gửi RateLimit-* headers chuẩn
  legacyHeaders: false,    // Tắt X-RateLimit-* headers cũ
});

// ─── Custom Rate Limiter (giữ lại để tương thích với các route hiện có) ────────
const rateLimitMap = new Map();

const rateLimiter = (maxRequests = 100, windowMs = 60000) => {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();

    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip);
    const validRequests = requests.filter(time => now - time < windowMs);

    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }

    validRequests.push(now);
    rateLimitMap.set(ip, validRequests);
    next();
  };
};

// Clear rate limit map định kỳ
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(time => now - time < 60000);
    if (validRequests.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, validRequests);
    }
  }
}, 60000);

module.exports = { rateLimiter, pricingRateLimiter };