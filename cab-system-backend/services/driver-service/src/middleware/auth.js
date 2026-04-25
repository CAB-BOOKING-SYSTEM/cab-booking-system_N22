// middleware/auth.js
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  try {
    // 1. Lấy thông tin user từ header (do Gateway truyền vào)
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    // 2. Kiểm tra xem user đã đăng nhập chưa
    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user identity headers',
      });
    }

    // 3. Phân quyền (RBAC): Chỉ driver hoặc admin mới được dùng API của Driver Service
    if (userRole !== 'driver' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Driver role required',
      });
    }

    // 4. Gắn thông tin vào req.user để các controller sử dụng
    req.user = {
      id: userId,
      driverId: userId, // Tương thích ngược với các controller cũ đang dùng driverId
      role: userRole,
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