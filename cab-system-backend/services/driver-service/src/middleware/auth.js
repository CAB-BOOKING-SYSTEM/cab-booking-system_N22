const jwt = require('jsonwebtoken');
const db = require('../config/database');
const logger = require('../utils/logger');

/**
 * Middleware xác thực JWT cho Driver Service
 * - Verify token từ header Authorization
 * - Tự động lấy driver_id từ auth_user_id trong token
 * - Gắn thông tin vào req.user và req.authDriverId
 */
module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Không tìm thấy token xác thực',
      });
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ',
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret');
    
    // Kiểm tra token hết hạn
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn',
      });
    }
    
    // Gắn thông tin user từ token vào request
    req.user = decoded;
    
    // Nếu là driver, lấy driver_id từ database bằng auth_user_id
    if (decoded.role === 'driver') {
      try {
        const query = `
          SELECT driver_id, auth_user_id, phone, email, full_name, 
                 license_plate, vehicle_type, status, rating, total_trips
          FROM drivers 
          WHERE auth_user_id = $1
        `;
        const result = await db.query(query, [decoded.sub]);
        
        if (result.rows.length > 0) {
          const driver = result.rows[0];
          req.authDriverId = driver.driver_id;
          req.driver = driver;
          
          logger.debug(`✅ Auth middleware: Driver found - authUserId=${decoded.sub}, driverId=${driver.driver_id}`);
        } else {
          logger.warn(`⚠️ Auth middleware: Driver not found for authUserId=${decoded.sub}`);
        }
      } catch (dbError) {
        logger.error('❌ Auth middleware: Database error when fetching driver:', dbError.message);
      }
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