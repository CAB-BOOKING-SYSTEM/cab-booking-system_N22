const axios = require('axios');
const pricingRepository = require('../repositories/pricingRepository');
const pricingService = require('./pricingService');
const { redisClient } = require('../config/redisConfig');
const { publishEvent } = require('../rabbitmq/producer');
const { v4: uuidv4 } = require('uuid');
const { computeSurge } = require('./surgeIntelligenceService');
const { isSurgeFeatureEnabled } = require('../config/featureFlags');
const { getETA } = require('./etaService');

// === AI Platform URL ===
const AI_PLATFORM_URL = process.env.AI_PLATFORM_URL || 'http://ai-platform:8080';

/**
 * Gọi AI Platform /predict/eta để lấy ETA chính xác từ mô hình ML.
 * Truyền: distance_km, hour_of_day, day_of_week, traffic_index.
 * Nếu AI lỗi → trả null, caller sẽ dùng fallback.
 */
async function getAIEta(distanceKm, pickupLat, pickupLng, dropoffLat, dropoffLng) {
  try {
    const now = new Date();
    const response = await axios.post(
      `${AI_PLATFORM_URL}/predict/eta`,
      {
        distance_km: distanceKm,
        hour_of_day: now.getHours(),
        day_of_week: now.getDay(),
        traffic_index: 0.5,
        is_rain: 0,
      },
      { timeout: 3000 }
    );

    const etaMinutes = response.data.eta_minutes;
    const modelVersion = response.data.model_version || 'unknown';
    console.log(`🤖 AI ETA: ${etaMinutes} minutes (model: ${modelVersion}, distance: ${distanceKm}km)`);

    return {
      eta_minutes: etaMinutes,
      eta_seconds: response.data.eta_seconds,
      model_version: modelVersion,
      source: 'ai-model',
    };
  } catch (error) {
    console.warn(`⚠️ AI ETA prediction failed: ${error.message}. Using fallback duration.`);
    return null;
  }
}

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
  let etaModelVersion = 'none';
  
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
  let surgeModelVersion = 'rule-based-fallback';
  let surgeSource = 'default';
  
  if (isSurgeFeatureEnabled()) {
    const surgeRaw = await redisClient.get(`surge:${finalZone}`);
    if (surgeRaw) {
      try {
        const surgeData = JSON.parse(surgeRaw);
        surgeMultiplier = surgeData.multiplier;
        surgeModelVersion = surgeData.modelVersion || 'unknown';
        surgeSource = surgeData.source || 'redis';
      } catch (e) {
        surgeMultiplier = parseFloat(surgeRaw);
        surgeModelVersion = 'legacy-v1';
        surgeSource = 'legacy';
      }
    } else {
      const persistedSurge = await pricingRepository.getSurge(finalZone);
      if (persistedSurge !== null && persistedSurge !== undefined) {
        surgeMultiplier = parseFloat(persistedSurge);
        surgeModelVersion = 'db-fallback';
        surgeSource = 'postgres';
      } else {
        const supply = parseInt(await redisClient.get(`drivers:${finalZone}:online:count`) || 0);
        const demand = parseInt(await redisClient.get(`requests:${finalZone}:pending:count`) || 0);
        const surgePrediction = await computeSurge({ zone: finalZone, supply, demand });
        surgeMultiplier = surgePrediction.multiplier;
        surgeModelVersion = surgePrediction.modelVersion;
        surgeSource = surgePrediction.source;
      }
    }
  } else {
    const persistedSurge = await pricingRepository.getSurge(finalZone);
    surgeMultiplier = parseFloat(persistedSurge ?? 1.0);
    surgeModelVersion = 'legacy-db-only';
    surgeSource = 'postgres';
  }
  
  console.log('Pricing config:', {
    base_fare: pricingConfig.base_fare,
    per_km_rate: pricingConfig.per_km_rate,
    per_minute_rate: pricingConfig.per_minute_rate
  });
  console.log(`Surge multiplier for ${finalZone}: ${surgeMultiplier} (model: ${surgeModelVersion}, source: ${surgeSource})`);
  
  // 5. Tính giá (dùng distance và duration đã có)
  const fare = pricingService.calculateFare({
    baseFare: Number(pricingConfig.base_fare),
    perKmRate: Number(pricingConfig.per_km_rate),
    perMinuteRate: Number(pricingConfig.per_minute_rate),
    distance: finalDistance,
    duration: finalDuration,
    surgeMultiplier: Number(surgeMultiplier)
  });
  
  console.log(`💰 Calculated fare: ${fare} VND (${finalDistance}km, ${finalDuration}min, surge: ${surgeMultiplier}x [${surgeSource}], eta: ${etaSource})`);
  
  // 6. Cache kết quả vào Redis
  const cacheKey = `estimate:${requestId}`;
  await redisClient.setEx(cacheKey, 300, JSON.stringify({
    requestId,
    vehicleType,
    distance: finalDistance,
    duration: finalDuration,
    zone: finalZone,
    surgeMultiplier: parseFloat(surgeMultiplier),
    surgeModelVersion: surgeModelVersion,
    surgeSource: surgeSource,
    etaModelVersion: etaModelVersion,
    etaSource: etaSource,
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
    surgeModelVersion: surgeModelVersion,
    surgeSource: surgeSource,
    etaModelVersion: etaModelVersion,
    etaSource: etaSource,
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
    surgeModelVersion: surgeModelVersion,
    surgeSource: surgeSource,
    etaModelVersion: etaModelVersion,
    etaSource: etaSource,
    modelVersion: surgeModelVersion,
    estimatedFare: fare,
    total: fare,
    currency: 'VND'
  };
};

module.exports = { calculateEstimate };