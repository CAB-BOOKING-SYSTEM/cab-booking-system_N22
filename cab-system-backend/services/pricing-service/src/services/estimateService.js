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
  
  const surgeRaw = await redisClient.get(`surge:${zone}`);
  if (surgeRaw) {
    try {
      // Format mới: JSON có multiplier và modelVersion
      const surgeData = JSON.parse(surgeRaw);
      surgeMultiplier = surgeData.multiplier;
      surgeModelVersion = surgeData.modelVersion || 'unknown';
      surgeSource = surgeData.source || 'redis';
    } catch (e) {
      // Format cũ: chỉ là số
      surgeMultiplier = parseFloat(surgeRaw);
      surgeModelVersion = 'legacy-v1';
      surgeSource = 'legacy';
    }
  }
  
  console.log('Pricing config:', {
    base_fare: pricingConfig.base_fare,
    per_km_rate: pricingConfig.per_km_rate,
    per_minute_rate: pricingConfig.per_minute_rate
  });
  console.log(`Surge multiplier for ${zone}: ${surgeMultiplier} (model: ${surgeModelVersion}, source: ${surgeSource})`);
  
  // 3. Gọi AI ETA nếu có tọa độ pickup/dropoff
  let finalDuration = Number(duration) || 0;
  let etaSource = 'booking-provided';
  let etaModelVersion = 'none';
  
  if (pickupLat && pickupLng && dropoffLat && dropoffLng && distance > 0) {
    const aiEta = await getAIEta(Number(distance), pickupLat, pickupLng, dropoffLat, dropoffLng);
    
    if (aiEta) {
      // Dùng ETA từ AI model thay cho duration gốc
      finalDuration = aiEta.eta_minutes;
      etaSource = aiEta.source;
      etaModelVersion = aiEta.model_version;
      console.log(`✅ Using AI ETA for pricing: ${finalDuration} minutes (source: ${etaSource})`);
    } else {
      console.log(`📐 Using booking-provided duration for pricing: ${finalDuration} minutes (fallback)`);
    }
  }
  
  // 4. Tính giá (dùng ETA từ AI hoặc duration gốc)
  const fare = pricingService.calculateFare({
    baseFare: Number(pricingConfig.base_fare),
    perKmRate: Number(pricingConfig.per_km_rate),
    perMinuteRate: Number(pricingConfig.per_minute_rate),
    distance: Number(distance),
    duration: finalDuration,
    surgeMultiplier: Number(surgeMultiplier)
  });
  
  console.log(`Calculated fare: ${fare} VND (surge: ${surgeMultiplier}x [${surgeSource}], eta: ${finalDuration}min [${etaSource}])`);
  
  // 5. Cache kết quả vào Redis
  const cacheKey = `estimate:${requestId}`;
  await redisClient.setEx(cacheKey, 300, JSON.stringify({
    requestId,
    vehicleType,
    distance,
    duration: finalDuration,
    zone,
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
  
  // 6. Gửi event RabbitMQ
  await publishEvent('pricing.estimate.calculated', {
    requestId,
    userId,
    vehicleType,
    distance,
    duration: finalDuration,
    zone,
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
  
  // 7. Trả về kết quả (có modelVersion và source)
  return {
    requestId,
    vehicleType,
    distance,
    duration: finalDuration,
    zone,
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