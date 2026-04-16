const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    
    // Kiểm tra token hết hạn
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn',
      });
    }
    
    req.user = decoded;
    
    // Matching service có thể được gọi bởi nhiều services khác
    // Cho phép booking-service, ride-service, và admin
    const allowedRoles = ['user', 'admin', 'booking', 'ride'];
    if (!allowedRoles.includes(decoded.role) && decoded.role !== 'admin') {
      logger.warn(`Unauthorized access attempt by role: ${decoded.role}`);
      return res.status(403).json({
        success: false,
        message: 'Truy cập bị từ chối. Không có quyền sử dụng matching service.',
      });
    }
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ',
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn',
      });
    }
    
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
    });
  }
};