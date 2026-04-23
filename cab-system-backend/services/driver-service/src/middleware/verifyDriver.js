const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware kiểm tra driverId trong URL có khớp với token không
 * Đảm bảo driver chỉ truy cập được dữ liệu của chính mình
 */
module.exports = async (req, res, next) => {
  try {
    const driverIdFromUrl = req.params.driverId;
    const authDriverId = req.authDriverId;
    
    if (!driverIdFromUrl) {
      return res.status(400).json({
        success: false,
        message: 'Thiếu driverId trên URL'
      });
    }
    
    if (!authDriverId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền truy cập tài nguyên này. Token không phải của driver.'
      });
    }
    
    if (driverIdFromUrl !== authDriverId) {
      return res.status(403).json({
        success: false,
        message: 'Bạn chỉ có thể truy cập thông tin của chính mình'
      });
    }
    
    // Gắn driverId đã được xác thực vào req
    req.driverId = driverIdFromUrl;
    
    logger.debug(`✅ Verify driver: driverId=${driverIdFromUrl} matches token`);
    next();
  } catch (error) {
    logger.error('Verify driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi xác thực driver: ' + error.message
    });
  }
};