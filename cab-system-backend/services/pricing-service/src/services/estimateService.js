const pricingRepository = require('../repositories/pricingRepository');
const pricingService = require('./pricingService');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');
const { v4: uuidv4 } = require('uuid');
const { computeSurge } = require('./surgeIntelligenceService');
const { isSurgeFeatureEnabled } = require('../config/featureFlags');
const { getETA } = require('./etaService');

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
  
  // 1. TỰ TÍNH distance & duration từ tọa độ - NGHIỆP VỤ CHÍNH
  let finalDistance = parseFloat(distance) || 0;
  let finalDuration = parseInt(duration) || 0;
  let etaSource = 'client-provided';
  
  if (pickupLat && pickupLng && dropoffLat && dropoffLng) {
    try {
      const etaResult = await getETA(pickupLat, pickupLng, dropoffLat, dropoffLng);
      
      if (etaResult && !etaResult.rejected && etaResult.distance_km > 0) {
        finalDistance = etaResult.distance_km;
        finalDuration = etaResult.eta_minutes;
        etaSource = etaResult.source || 'eta-service';
        
        console.log(`📍 ETA calculated: ${finalDistance}km, ${finalDuration}min (source: ${etaSource})`);
      }
    } catch (etaError) {
      console.warn(`⚠️ ETA calculation failed: ${etaError.message}. Using client-provided distance/duration.`);
      
      if (!finalDistance || !finalDuration) {
        throw new Error('Cannot calculate estimate: missing distance/duration and ETA failed');
      }
    }
  } else if (!finalDistance || !finalDuration) {
    throw new Error('Missing required fields: either (pickupLat, pickupLng, dropoffLat, dropoffLng) or (distance, duration)');
  }
  
  // 2. Lấy pricing config từ database
  const pricingConfig = await pricingRepository.getPricing(vehicleType);
  if (!pricingConfig) {
    console.warn('Vehicle type not found', { requestId, vehicleType });
    throw new Error('Vehicle type not found');
  }
  
  // 3. Xác định zone (nếu chưa có)
  const finalZone = zone || 'SUBURB';
  
  // 4. Lấy surge multiplier
  let surgeMultiplier = 1.0;
  let modelVersion = 'rule-based-fallback';
  let surgeSource = 'default';
  
  if (!isSurgeFeatureEnabled()) {
    const persistedSurge = await pricingRepository.getSurge(finalZone);
    surgeMultiplier = parseFloat(persistedSurge ?? 1.0);
    modelVersion = 'legacy-db-only';
    surgeSource = 'postgres';
  } else {
    const surgeRaw = await redisClient.get(`surge:${finalZone}`);
    if (surgeRaw) {
      try {
        const surgeData = JSON.parse(surgeRaw);
        surgeMultiplier = surgeData.multiplier;
        modelVersion = surgeData.modelVersion || 'unknown';
        surgeSource = surgeData.source || 'redis-cache';
      } catch (e) {
        surgeMultiplier = parseFloat(surgeRaw);
        modelVersion = 'legacy-v1';
        surgeSource = 'legacy-cache';
      }
    } else {
      const persistedSurge = await pricingRepository.getSurge(finalZone);
      if (persistedSurge !== null && persistedSurge !== undefined) {
        surgeMultiplier = parseFloat(persistedSurge);
        modelVersion = 'db-fallback';
        surgeSource = 'postgres';
      } else {
        const supply = parseInt(await redisClient.get(`drivers:${finalZone}:online:count`) || 0);
        const demand = parseInt(await redisClient.get(`requests:${finalZone}:pending:count`) || 0);
        const surgePrediction = await computeSurge({ zone: finalZone, supply, demand });
        surgeMultiplier = surgePrediction.multiplier;
        modelVersion = surgePrediction.modelVersion;
        surgeSource = surgePrediction.source;

        await redisClient.set(`surge:${finalZone}`, JSON.stringify({
          multiplier: surgeMultiplier,
          modelVersion,
          source: surgeSource,
          features: surgePrediction.features,
          fallbackReason: surgePrediction.fallbackReason || null,
          updatedAt: new Date().toISOString(),
        }));
      }
    }
  }
  
  console.log('Pricing config:', {
    base_fare: pricingConfig.base_fare,
    per_km_rate: pricingConfig.per_km_rate,
    per_minute_rate: pricingConfig.per_minute_rate
  });
  console.log(`Surge multiplier for ${finalZone}: ${surgeMultiplier} (model: ${modelVersion}, source: ${surgeSource})`);
  
  // 5. Tính giá
  const fare = pricingService.calculateFare({
    baseFare: Number(pricingConfig.base_fare),
    perKmRate: Number(pricingConfig.per_km_rate),
    perMinuteRate: Number(pricingConfig.per_minute_rate),
    distance: finalDistance,
    duration: finalDuration,
    surgeMultiplier: Number(surgeMultiplier)
  });
  
  console.log(`💰 Calculated fare: ${fare} VND (${finalDistance}km, ${finalDuration}min, surge: ${surgeMultiplier}x)`);
  
  // 6. Cache kết quả vào Redis
  const cacheKey = `estimate:${requestId}`;
  await redisClient.setEx(cacheKey, 300, JSON.stringify({
    requestId,
    vehicleType,
    distance: finalDistance,
    duration: finalDuration,
    zone: finalZone,
    surgeMultiplier: parseFloat(surgeMultiplier),
    modelVersion: modelVersion,
    surgeSource,
    etaSource,
    estimatedFare: fare,
    currency: 'VND',
    userId,
    timestamp: new Date().toISOString()
  }));
  
  // 7. Gửi event RabbitMQ
  await publishEvent('pricing.estimate.calculated', {
    requestId,
    userId,
    vehicleType,
    distance: finalDistance,
    duration: finalDuration,
    zone: finalZone,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    surgeMultiplier: parseFloat(surgeMultiplier),
    modelVersion: modelVersion,
    surgeSource,
    etaSource,
    estimatedFare: fare,
    paymentMethod: paymentMethod || 'unknown',
    currency: 'VND',
    timestamp: new Date().toISOString()
  });
  
  // 8. Trả về kết quả
  return {
    requestId,
    vehicleType,
    distance: finalDistance,
    duration: finalDuration,
    zone: finalZone,
    surgeMultiplier: parseFloat(surgeMultiplier),
    modelVersion: modelVersion,
    surgeSource,
    etaSource,
    estimatedFare: fare,
    total: fare,
    currency: 'VND'
  };
};

module.exports = { calculateEstimate };