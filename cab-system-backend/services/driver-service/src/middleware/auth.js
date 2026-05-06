// middleware/auth.js
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  try {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];
    const driverIdHeader = req.headers['x-driver-id'];

    if (!userId || !userRole) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: Missing user identity headers',
      });
    }

    if (userRole !== 'driver' && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Driver role required',
      });
    }

    // 🔥 Dùng driverId từ header, fallback sang userId
    const driverId = driverIdHeader || userId;
    
    req.user = {
      id: userId,
      driverId: driverId,
      role: userRole,
    };
    
    logger.info(`Auth success: userId=${userId}, driverId=${driverId}, role=${userRole}`);
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};