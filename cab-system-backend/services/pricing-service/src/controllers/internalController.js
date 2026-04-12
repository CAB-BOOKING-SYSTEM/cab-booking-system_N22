const { redisClient } = require('../config/redisConfig');
const { successResponse, errorResponse } = require('../utils/responseUtil');

// Driver Service gọi API này khi driver online/offline hoặc đổi zone
const updateDriverCount = async (req, res) => {
  try {
    const { zone, count } = req.body;
    
    if (!zone) return errorResponse(res, 'Zone is required');
    if (count === undefined) return errorResponse(res, 'Count is required');
    
    await redisClient.set(`drivers:${zone}:online:count`, count);
    
    // Cập nhật tổng số
    let total = 0;
    const zones = ['CENTER', 'AIRPORT', 'SUBURB'];
    for (const z of zones) {
      const c = await redisClient.get(`drivers:${z}:online:count`) || 0;
      total += parseInt(c);
    }
    await redisClient.set('drivers:online:count', total);
    
    console.log(`📊 Driver count updated: ${zone}=${count}, total=${total}`);
    return successResponse(res, { message: 'Updated successfully' });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Booking Service gọi API này khi tạo/cancel booking
const updateRequestCount = async (req, res) => {
  try {
    const { zone, count } = req.body;
    
    if (!zone) return errorResponse(res, 'Zone is required');
    if (count === undefined) return errorResponse(res, 'Count is required');
    
    await redisClient.set(`requests:${zone}:pending:count`, count);
    
    // Cập nhật tổng số
    let total = 0;
    const zones = ['CENTER', 'AIRPORT', 'SUBURB'];
    for (const z of zones) {
      const c = await redisClient.get(`requests:${z}:pending:count`) || 0;
      total += parseInt(c);
    }
    await redisClient.set('requests:pending:count', total);
    
    console.log(`📊 Request count updated: ${zone}=${count}, total=${total}`);
    return successResponse(res, { message: 'Updated successfully' });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Lấy surge hiện tại (cho các service khác)
const getCurrentSurge = async (req, res) => {
  try {
    const { zone } = req.params;
    const surge = await redisClient.get(`surge:${zone}`) || 1.0;
    return successResponse(res, { zone, surge: parseFloat(surge) });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  updateDriverCount,
  updateRequestCount,
  getCurrentSurge
};