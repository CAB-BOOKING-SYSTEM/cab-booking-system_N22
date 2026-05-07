const { redisClient } = require('../config/redisConfig');
const { successResponse, errorResponse } = require('../utils/responseUtil');
const { getKnownZones } = require('../utils/zoneUtil');

// Driver Service gọi API này khi driver online/offline hoặc đổi zone
const updateDriverCount = async (req, res) => {
  try {
    const { zone, count } = req.body;
    
    if (!zone) return errorResponse(res, 'Zone is required');
    if (count === undefined) return errorResponse(res, 'Count is required');
    
    await redisClient.set(`drivers:${zone}:online:count`, count);
    
    let total = 0;
    const zones = getKnownZones();
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
    
    let total = 0;
    const zones = getKnownZones();
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

const adjustRequestCount = async (req, res) => {
  try {
    const { zone, delta } = req.body;

    if (!zone) return errorResponse(res, 'Zone is required');
    if (delta === undefined) return errorResponse(res, 'Delta is required');

    const current = parseInt(await redisClient.get(`requests:${zone}:pending:count`) || 0);
    const next = Math.max(0, current + parseInt(delta));
    await redisClient.set(`requests:${zone}:pending:count`, next);

    let total = 0;
    for (const z of getKnownZones()) {
      const count = await redisClient.get(`requests:${z}:pending:count`) || 0;
      total += parseInt(count);
    }
    await redisClient.set('requests:pending:count', total);

    console.log(`📊 Request count adjusted: ${zone} ${current} -> ${next} (delta=${delta}), total=${total}`);
    return successResponse(res, { zone, previous: current, current: next, total });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

// Lấy surge hiện tại (cho các service khác)
const getCurrentSurge = async (req, res) => {
  try {
    const { zone } = req.params;
    const surgeRaw = await redisClient.get(`surge:${zone}`);
    if (!surgeRaw) {
      return successResponse(res, {
        zone,
        surge: 1.0,
        multiplier: 1.0,
        modelVersion: 'default-no-cache',
        source: 'default',
      });
    }

    try {
      const surgeData = JSON.parse(surgeRaw);
      return successResponse(res, {
        zone,
        surge: parseFloat(surgeData.multiplier || 1.0),
        multiplier: parseFloat(surgeData.multiplier || 1.0),
        modelVersion: surgeData.modelVersion || 'unknown',
        source: surgeData.source || 'redis',
        updatedAt: surgeData.updatedAt || null,
      });
    } catch {
      return successResponse(res, {
        zone,
        surge: parseFloat(surgeRaw),
        multiplier: parseFloat(surgeRaw),
        modelVersion: 'legacy-v1',
        source: 'legacy',
      });
    }
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  updateDriverCount,
  updateRequestCount,
  adjustRequestCount,
  getCurrentSurge
};
