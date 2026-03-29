const pricingRepository = require('../repositories/pricingRepository');
const surgeRepository = require('../repositories/surgeRepository');
const pricingService = require('./pricingService');
const historicalRepository = require('../repositories/historicalRepository');
const { v4: uuidv4 } = require('uuid');

const calculateEstimate = async ({ vehicleType, distance, duration, zone }) => {
  const requestId = uuidv4();
  
  console.log('Calculating estimate', { requestId, vehicleType, distance, duration, zone });
  
  const pricingConfig = await pricingRepository.getPricing(vehicleType);
  if (!pricingConfig) {
    console.warn('Vehicle type not found', { requestId, vehicleType });
    throw new Error('Vehicle type not found');
  }

  const surgeMultiplier = await surgeRepository.getSurge(zone);
  
  // Ép kiểu số
  const fare = pricingService.calculateFare({
    baseFare: Number(pricingConfig.base_fare),
    perKmRate: Number(pricingConfig.per_km_rate),
    perMinuteRate: Number(pricingConfig.per_minute_rate),
    distance: Number(distance),
    duration: Number(duration),
    surgeMultiplier: Number(surgeMultiplier)
  });

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
    estimatedFare: fare
  });

  return {
    requestId,
    vehicleType,
    distance,
    duration,
    surgeMultiplier,
    estimatedFare: fare
  };
};

module.exports = { calculateEstimate };