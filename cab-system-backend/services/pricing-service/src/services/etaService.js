const { redisClient } = require('../config/redisConfig');

// Công thức Haversine tính khoảng cách giữa 2 tọa độ (km)
function calculateDistance(lat1, lon1, lat2, lon2) {
  // THÊM ĐOẠN NÀY - Nếu cùng tọa độ, trả về 0 ngay
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }
  
  const R = 6371; // Bán kính trái đất (km)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Tính ETA dựa trên khoảng cách và tốc độ trung bình
function calculateETA(distanceKm, avgSpeedKmph = 30) {
  const etaMinutes = (distanceKm / avgSpeedKmph) * 60;
  // Traffic level: 0 = thông thoáng, 1 = tắc đường cực độ
  const trafficLevel = Math.min(0.5 + (distanceKm / 20), 1.0);
  
  return {
    distance_km: Math.round(distanceKm * 10) / 10,
    eta_minutes: Math.round(etaMinutes),
    eta_seconds: Math.round(etaMinutes * 60),
    traffic_level: Math.round(trafficLevel * 10) / 10,
    speed_kph: avgSpeedKmph
  };
}

async function getETA(pickupLat, pickupLng, dropoffLat, dropoffLng) {
  const cacheKey = `eta:${pickupLat},${pickupLng}:${dropoffLat},${dropoffLng}`;
  
  // 1. Kiểm tra cache Redis
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    console.log('✅ ETA cache hit');
    return JSON.parse(cached);
  }
  
  // 2. Tính khoảng cách
  const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
  
  // 3. Tính ETA
  const eta = calculateETA(distance);
  
  // 4. Lưu cache Redis (1 giờ)
  await redisClient.setEx(cacheKey, 3600, JSON.stringify(eta));
  
  // 5. Lưu vào Feature Store cho AI Matching
  const featureKey = `feature:eta:${Date.now()}`;
  const featureData = {
    feature_id: featureKey,
    type: 'eta',
    pickup: { lat: pickupLat, lng: pickupLng },
    dropoff: { lat: dropoffLat, lng: dropoffLng },
    distance_km: eta.distance_km,
    eta_minutes: eta.eta_minutes,
    eta_seconds: eta.eta_seconds,
    traffic_level: eta.traffic_level,
    timestamp: new Date().toISOString()
  };
  await redisClient.setEx(featureKey, 86400, JSON.stringify(featureData)); // Lưu 24h
  
  console.log(`📍 ETA calculated: ${eta.distance_km}km, ${eta.eta_minutes}min, traffic: ${eta.traffic_level}`);
  
  return eta;
}

module.exports = { getETA, calculateDistance, calculateETA };