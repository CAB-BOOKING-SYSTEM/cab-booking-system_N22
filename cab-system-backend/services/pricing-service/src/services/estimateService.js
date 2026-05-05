const pricingRepository = require('../repositories/pricingRepository');
const pricingService = require('./pricingService');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');
const { v4: uuidv4 } = require('uuid');

const calculateEstimate = async ({ pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType, distance, duration, zone, paymentMethod, userId }) => {
  const requestId = uuidv4();
  
  console.log('Calculating estimate', { 
    requestId, 
    vehicleType, 
    zone, 
    distance, 
    duration,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng
  });
  
  // 1. Lấy pricing config từ database
  const pricingConfig = await pricingRepository.getPricing(vehicleType);
  if (!pricingConfig) {
    console.warn('Vehicle type not found', { requestId, vehicleType });
    throw new Error('Vehicle type not found');
  }
  
  // 2. Lấy surge multiplier từ Redis (có thể là JSON hoặc số cũ)
  let surgeMultiplier = 1.0;
  let modelVersion = 'rule-based-fallback';
  
  const surgeRaw = await redisClient.get(`surge:${zone}`);
  if (surgeRaw) {
    try {
      // Format mới: JSON có multiplier và modelVersion
      const surgeData = JSON.parse(surgeRaw);
      surgeMultiplier = surgeData.multiplier;
      modelVersion = surgeData.modelVersion || 'unknown';
    } catch (e) {
      // Format cũ: chỉ là số
      surgeMultiplier = parseFloat(surgeRaw);
      modelVersion = 'legacy-v1';
    }
  }
  
  console.log('Pricing config:', {
    base_fare: pricingConfig.base_fare,
    per_km_rate: pricingConfig.per_km_rate,
    per_minute_rate: pricingConfig.per_minute_rate
  });
  console.log(`Surge multiplier for ${zone}: ${surgeMultiplier} (model: ${modelVersion})`);
  
  // 3. Tính giá
  const fare = pricingService.calculateFare({
    baseFare: Number(pricingConfig.base_fare),
    perKmRate: Number(pricingConfig.per_km_rate),
    perMinuteRate: Number(pricingConfig.per_minute_rate),
    distance: Number(distance),
    duration: Number(duration),
    surgeMultiplier: Number(surgeMultiplier)
  });
  
  console.log(`Calculated fare: ${fare} VND`);
  
  // 4. Cache kết quả vào Redis
  const cacheKey = `estimate:${requestId}`;
  await redisClient.setEx(cacheKey, 300, JSON.stringify({
    requestId,
    vehicleType,
    distance,
    duration,
    zone,
    surgeMultiplier: parseFloat(surgeMultiplier),
    modelVersion: modelVersion,
    estimatedFare: fare,
    currency: 'VND',
    userId,
    timestamp: new Date().toISOString()
  }));
  
  // 5. Gửi event RabbitMQ
  await publishEvent('pricing.estimate.calculated', {
    requestId,
    userId,
    vehicleType,
    distance,
    duration,
    zone,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    surgeMultiplier: parseFloat(surgeMultiplier),
    modelVersion: modelVersion,
    estimatedFare: fare,
    paymentMethod: paymentMethod || 'unknown',
    currency: 'VND',
    timestamp: new Date().toISOString()
  });
  
  // 6. Trả về kết quả (có modelVersion)
  return {
    requestId,
    vehicleType,
    distance,
    duration,
    zone,
    surgeMultiplier: parseFloat(surgeMultiplier),
    modelVersion: modelVersion,
    estimatedFare: fare,
    total: fare,
    currency: 'VND'
  };
};

module.exports = { calculateEstimate };