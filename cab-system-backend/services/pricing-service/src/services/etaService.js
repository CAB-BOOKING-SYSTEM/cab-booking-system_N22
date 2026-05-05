// services/pricing-service/src/services/etaService.js
const { redisClient } = require('../config/redisConfig');
const { getRouteInfo } = require('./mapProvider');

/**
 * Công thức Haversine tính khoảng cách đường chim bay
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (lat1 === lat2 && lon1 === lon2) return 0;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Hàm tính ETA dự phòng (Tên hàm đã được sửa thành calculateETA cho khớp với module.exports)
 */
function calculateETA(distanceKm, avgSpeedKmph = 30) {
    const etaMinutes = (distanceKm / avgSpeedKmph) * 60;
    const trafficLevel = Math.min(0.5 + (distanceKm / 20), 1.0);
    return {
        distance_km: Math.round(distanceKm * 10) / 10,
        eta_minutes: Math.round(etaMinutes),
        eta_seconds: Math.round(etaMinutes * 60),
        traffic_level: Math.round(trafficLevel * 10) / 10,
        speed_kph: avgSpeedKmph,
        source: 'haversine_fallback'
    };
}

/**
 * Hàm chính getETA
 */
async function getETA(pickupLat, pickupLng, dropoffLat, dropoffLng) {
    // 1. Tính distance để check Outlier (Test Case 50)
    const distance = calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);

  // 2. NGƯỠNG REJECT (Ví dụ: hệ thống chỉ phục vụ trong phạm vi 300km)
    if (distance > 300) {
        console.warn(`🚨 Rejecting Outlier: Distance ${distance.toFixed(1)}km is too far.`);
        
        return {
            success: false, // Trả về false để Controller nhận diện lỗi nghiệp vụ
            message: "Quãng đường quá xa (giới hạn 300km), vui lòng chọn lại điểm đón/trả.",
            data: {
                distance_km: Math.round(distance * 10) / 10,
                rejected: true
            }
        };
    }

    // 2. Check Cache
    const cacheKey = `eta:${pickupLat},${pickupLng}:${dropoffLat},${dropoffLng}`;
    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            console.log('✅ ETA cache hit');
            return JSON.parse(cached);
        }
    } catch (err) {
        console.error('Redis Error:', err.message);
    }

    // 3. Tính toán có Fallback
    let eta;
    try {
        const routeInfo = await getRouteInfo(pickupLat, pickupLng, dropoffLat, dropoffLng);
        const actualSpeed  = routeInfo.distanceKm / (routeInfo.durationMin / 60);
        const trafficLevel = Math.round(Math.min(Math.max(1 - actualSpeed / 50, 0), 1) * 10) / 10;
        eta = {
            distance_km:   Math.round(routeInfo.distanceKm * 10) / 10,
            eta_minutes:   Math.round(routeInfo.durationMin),
            eta_seconds:   Math.round(routeInfo.durationMin * 60),
            traffic_level: trafficLevel,
            speed_kph:     Math.round(actualSpeed * 10) / 10,
            source:        routeInfo.provider,
        };
    } catch (error) {
        console.warn('\x1b[33m%s\x1b[0m', `⚠️ Map API failed (${error.message}). Fallback to Haversine.`);
        eta = calculateETA(distance);
    }

    // 4. Lưu Cache & Feature Store (Test Case 118)
    try {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(eta));
        
        const featureKey = `feature:eta:${Date.now()}`;
        const featureData = {
            feature_id: featureKey,
            type: 'eta',
            pickup: { lat: pickupLat, lng: pickupLng },
            dropoff: { lat: dropoffLat, lng: dropoffLng },
            ...eta,
            timestamp: new Date().toISOString()
        };
        await redisClient.setEx(featureKey, 86400, JSON.stringify(featureData));
    } catch (err) {
        console.error('Storage Error:', err.message);
    }

    return eta;
}

/**
 * Tính ETA của tài xế từ vị trí hiện tại đến điểm đón khách.
 *
 * @param {string} driverId   - ID tài xế (dùng để tra Redis)
 * @param {number} pickupLat  - Vĩ độ điểm đón
 * @param {number} pickupLng  - Kinh độ điểm đón
 * @returns {Promise<{ distance_km, eta_minutes, eta_seconds, source }>}
 * @throws {Error} Nếu tài xế chưa có vị trí trong Redis
 */
async function getDriverToPickupETA(driverId, pickupLat, pickupLng) {
    // 1. Lấy tọa độ tài xế từ Redis
    const locationKey = `driver:${driverId}:location`;
    const rawLocation = await redisClient.get(locationKey);

    if (!rawLocation) {
        throw new Error(`Driver location not found for driverId: ${driverId}`);
    }

    // 2. Parse tọa độ tài xế
    let driverLocation;
    try {
        driverLocation = JSON.parse(rawLocation);
    } catch (_) {
        throw new Error(`Invalid driver location data for driverId: ${driverId}`);
    }

    const { lat: driverLat, lng: driverLng } = driverLocation;
    if (driverLat === undefined || driverLng === undefined) {
        throw new Error(`Driver location missing lat/lng for driverId: ${driverId}`);
    }

    console.log(`🚗 Driver ${driverId} at (${driverLat}, ${driverLng}) → Pickup (${pickupLat}, ${pickupLng})`);

    // 3. Tính khoảng cách Haversine trước (dùng cho fallback)
    const haversineDistance = calculateDistance(driverLat, driverLng, pickupLat, pickupLng);

    // 4. Gọi Map API → fallback Haversine nếu lỗi
    let result;
    try {
        const routeInfo = await getRouteInfo(driverLat, driverLng, pickupLat, pickupLng);
        const actualSpeed  = routeInfo.distanceKm / (routeInfo.durationMin / 60);
        const trafficLevel = Math.round(Math.min(Math.max(1 - actualSpeed / 50, 0), 1) * 10) / 10;

        result = {
            distance_km:   Math.round(routeInfo.distanceKm * 10) / 10,
            eta_minutes:   Math.round(routeInfo.durationMin),
            eta_seconds:   Math.round(routeInfo.durationMin * 60),
            traffic_level: trafficLevel,
            speed_kph:     Math.round(actualSpeed * 10) / 10,
            source:        routeInfo.provider,
        };

        console.log(`✅ Driver ETA from [${result.source}]: ${result.distance_km}km, ${result.eta_minutes}min`);
    } catch (apiErr) {
        console.warn(`⚠️ Map API failed (${apiErr.message}). Fallback to Haversine for driver ETA.`);
        const fallback = calculateETA(haversineDistance, 35); // Tài xế thường chạy nhanh hơn (35km/h)
        result = {
            distance_km:   fallback.distance_km,
            eta_minutes:   fallback.eta_minutes,
            eta_seconds:   fallback.eta_seconds,
            traffic_level: fallback.traffic_level,
            speed_kph:     fallback.speed_kph,
            source:        'haversine_fallback',
        };
    }

    return result;
}

// Export các hàm
module.exports = { getETA, getDriverToPickupETA, calculateDistance, calculateETA };