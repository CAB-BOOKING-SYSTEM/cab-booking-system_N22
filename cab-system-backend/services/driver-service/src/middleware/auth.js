 const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    
    // Check if user has driver role
    if (req.user.role !== 'driver' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Driver role required.',
      });
    }
    
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};
