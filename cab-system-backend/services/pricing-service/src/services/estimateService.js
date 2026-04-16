const pricingRepository = require('../repositories/pricingRepository');
const pricingService = require('./pricingService');
const historicalRepository = require('../repositories/historicalRepository');
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
  
  // 2. Lấy surge multiplier từ Redis (đã được Surge AI tính)
  const surgeMultiplier = await redisClient.get(`surge:${zone}`) || 1.0;
  
  console.log('Pricing config:', {
    base_fare: pricingConfig.base_fare,
    per_km_rate: pricingConfig.per_km_rate,
    per_minute_rate: pricingConfig.per_minute_rate
  });
  console.log(`Surge multiplier for ${zone}: ${surgeMultiplier}`);
  
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
  
  // 4. Lưu lịch sử
  await historicalRepository.saveHistory({
    requestId,
    vehicleType,
    distance,
    duration,
    zone,
    baseFare: pricingConfig.base_fare,
    perKmRate: pricingConfig.per_km_rate,
    perMinuteRate: pricingConfig.per_minute_rate,
    surgeMultiplier,
    estimatedFare: fare,
    userId
  });
  
  // 5. Gửi event RabbitMQ cho Notification Service
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
    estimatedFare: fare,
    paymentMethod: paymentMethod || 'unknown',
    currency: 'VND',
    timestamp: new Date().toISOString()
  });
  
  return {
    requestId,
    vehicleType,
    distance,
    duration,
    zone,
    surgeMultiplier: parseFloat(surgeMultiplier),
    estimatedFare: fare,
    currency: 'VND'
  };
};

module.exports = { calculateEstimate };