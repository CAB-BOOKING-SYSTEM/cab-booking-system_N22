const express = require('express');
const router = express.Router();

const estimateRoutes = require('./estimateRoutes');
const pricingRoutes = require('./pricingRoutes');
const surgeRoutes = require('./surgeRoutes');
const healthRoutes = require('./healthRoutes');
const { rateLimiter } = require('../middleware/rateLimitMiddleware');
const { verifyToken } = require('../middleware/authMiddleware');

// Routes không cần xác thực
router.use('/health', healthRoutes);

// Routes cần xác thực (tạm thời bỏ xác thực để test)
// router.use(verifyToken);
router.use('/estimate', rateLimiter(50, 60000), estimateRoutes);
router.use('/pricing', pricingRoutes);
router.use('/surge', surgeRoutes);

module.exports = router;