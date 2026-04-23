// middleware/auth.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// 🔥 Lấy JWT_SECRET từ env (phải giống với Auth Service)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

module.exports = async (req, res, next) => {
  try {
    // Lấy token từ Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No token provided',
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify JWT với secret (giống Auth Service)
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token',
      });
    }

    // 🔥 LẤY driverId TỪ TOKEN
    // Auth Service trả về JWT với payload: { sub: driverId, role: 'driver', ... }
    const driverId = decoded.sub || decoded.driverId || decoded.id;
    
    if (!driverId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token: missing driverId',
      });
    }

    // Kiểm tra role (chỉ driver mới được gọi driver API)
    if (decoded.role !== 'driver' && decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Driver role required',
      });
    }

    // Gắn thông tin vào req
    req.user = {
      driverId: driverId,
      email: decoded.email,
      role: decoded.role,
      ...decoded
    };
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};