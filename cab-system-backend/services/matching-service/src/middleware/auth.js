const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy thông tin xác thực người dùng',
      });
    }

    req.user = {
      id: userId,
      userId: userId,
      role: userRole,
    };
    
    // Matching service có thể được gọi bởi nhiều services khác
    // Cho phép booking-service, ride-service, user, và admin
    const allowedRoles = ['user', 'admin', 'booking', 'ride'];
    if (!allowedRoles.includes(userRole) && userRole !== 'admin') {
      logger.warn(`Unauthorized access attempt by role: ${userRole}`);
      return res.status(403).json({
        success: false,
        message: 'Truy cập bị từ chối. Không có quyền sử dụng matching service.',
      });
    }
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi xác thực',
    });
  }
};