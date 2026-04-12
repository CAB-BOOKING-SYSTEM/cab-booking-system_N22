const axios = require('axios');
const { redisClient } = require('../config/redisConfig');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Hàm tính khoảng cách Haversine (fallback)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

async function getETA(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  const cacheKey = `eta:${pickupLat},${pickupLng}:${dropoffLat},${dropoffLng}`;
  
  // 1. Kiểm tra cache Redis
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('✅ ETA cache hit');
    return JSON.parse(cached);
  }
  
  try {
    // 2. Gọi Google Maps API
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: `${pickupLat},${pickupLng}`,
        destinations: `${dropoffLat},${dropoffLng}`,
        key: GOOGLE_MAPS_API_KEY,
        traffic_model: 'best_guess',
        departure_time: 'now'
      },
      timeout: 5000
    });
    
    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
      throw new Error('Google Maps API returned error');
    }
    
    const result = {
      distance: Math.round(element.distance.value / 1000 * 10) / 10,
      duration: Math.round(element.duration.value / 60),
      durationInTraffic: Math.round((element.duration_in_traffic?.value || element.duration.value) / 60),
      trafficFactor: Math.round((element.duration_in_traffic?.value / element.duration.value) * 10) / 10 || 1
    };
    
    // 3. Lưu cache Redis (5 phút)
    await redisClient.setEx(cacheKey, 300, JSON.stringify(result));
    console.log(`📍 ETA: ${result.distance}km, ${result.duration}min, traffic: ${result.trafficFactor}x`);
    
    return result;
    
  } catch (error) {
    console.error('Google Maps API error:', error.message);
    
    // 4. Fallback: dùng cache cũ nếu có
    const oldCache = await redisClient.get(cacheKey);
    if (oldCache) {
      console.log('⚠️ Using stale cache fallback');
      return JSON.parse(oldCache);
    }
    
    // 5. Fallback cuối cùng: tính theo đường chim bay
    const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const result = {
      distance: Math.round(distance * 10) / 10,
      duration: Math.round(distance * 3 * 10) / 10,
      durationInTraffic: Math.round(distance * 4 * 10) / 10,
      trafficFactor: 1.3
    };
    
    console.log('⚠️ Using fallback calculation');
    return result;
  }
}

module.exports = { getETA };