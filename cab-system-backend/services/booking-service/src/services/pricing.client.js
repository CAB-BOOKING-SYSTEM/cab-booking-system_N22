// src/services/pricing.client.js
const axios = require("axios");
const mtls = require("../../../../../shared/mtls.cjs");

const httpsAgent = mtls.createClientAgent();

class PricingClient {
  constructor(config) {
    this.baseURL = config.pricingService.url;
    this.timeout = config.pricingService.timeout;
    this.retries = config.pricingService.retries;
  }

  // ========== THÊM HÀM TÍNH KHOẢNG CÁCH (HAVERSINE) ==========
  /**
   * Tính khoảng cách giữa 2 điểm GPS (km)
   * Dùng công thức Haversine
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
    
    const R = 6371; // Bán kính trái đất (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Tính duration (phút) từ distance (km)
   * Giả sử tốc độ trung bình 30km/h trong thành phố
   */
  calculateDuration(distanceKm, trafficLevel = 0.5) {
    if (!distanceKm || distanceKm <= 0) return 0;
    // Tốc độ cơ bản 30km/h, bị ảnh hưởng bởi traffic (0.5 = bình thường, 1 = kẹt xe)
    const speedKmph = 30 * (1 - trafficLevel * 0.4);
    const hours = distanceKm / Math.max(speedKmph, 5);
    return Math.ceil(hours * 60); // phút
  }

  // ========== THÊM HÀM LẤY ETA FALLBACK ==========
  /**
   * Lấy ETA từ tọa độ (fallback khi Pricing Service chết)
   * Trả về { distance_km, eta_minutes, source }
   */
  async getETAFallback(pickupLat, pickupLng, dropoffLat, dropoffLng) {
    const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const etaMinutes = this.calculateDuration(distance);
    
    console.log(`📍 [Fallback] Calculated distance: ${distance.toFixed(2)}km, ETA: ${etaMinutes}min`);
    
    return {
      distance_km: Math.round(distance * 10) / 10,
      eta_minutes: etaMinutes,
      eta_seconds: etaMinutes * 60,
      traffic_level: 0.5,
      speed_kph: 30,
      source: 'client-fallback-haversine'
    };
  }

  async estimatePrice(data) {
    let lastError;

    // Map vehicleType từ booking sang pricing service
    let mappedVehicleType = data.vehicleType;
    if (data.vehicleType === "car_4") mappedVehicleType = "car";
    if (data.vehicleType === "car_7") mappedVehicleType = "suv";
    if (data.vehicleType === "motorbike") mappedVehicleType = "bike";

    const requestData = {
      pickupLocation: data.pickupLocation,
      dropoffLocation: data.dropoffLocation,
      vehicleType: mappedVehicleType,
      distance: data.distance || 0,
      duration: data.duration || 0,
      zone: data.zone,
      pickupLat: data.pickupLocation?.lat,
      pickupLng: data.pickupLocation?.lng,
      dropoffLat: data.dropoffLocation?.lat,
      dropoffLng: data.dropoffLocation?.lng,
    };

    for (let i = 0; i <= this.retries; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/api/v1/estimate`,
          requestData,
          {
            timeout: this.timeout,
            headers: { "Content-Type": "application/json" },
            ...(httpsAgent ? { httpsAgent } : {}),
          },
        );

        const pricingData = response.data.data;

        console.log("✅ Pricing response:", JSON.stringify(pricingData, null, 2));

        return {
          basePrice: Math.round(pricingData.estimatedFare * 0.3),
          distancePrice: Math.round(pricingData.estimatedFare * 0.5),
          timePrice: Math.round(pricingData.estimatedFare * 0.2),
          surgeMultiplier: pricingData.surgeMultiplier || 1,
          total: pricingData.estimatedFare,
          currency: pricingData.currency || "VND",
          distance: pricingData.distance,
          duration: pricingData.duration,
          zone: pricingData.zone,
          etaSource: pricingData.etaSource,
          modelVersion: pricingData.modelVersion,
        };
      } catch (error) {
        lastError = error;
        console.warn(
          `Pricing estimate attempt ${i + 1} failed:`,
          error.message,
        );

        if (i < this.retries) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn("⚠️ Pricing Service unavailable, using fallback calculation");
    
    // ========== FALLBACK: TỰ TÍNH DISTANCE & DURATION ==========
    let finalDistance = data.distance || 0;
    let finalDuration = data.duration || 0;
    let etaSource = 'client-provided';
    
    // Nếu có tọa độ, tự tính distance & duration
    if (data.pickupLocation?.lat && data.pickupLocation?.lng &&
        data.dropoffLocation?.lat && data.dropoffLocation?.lng) {
      
      finalDistance = this.calculateDistance(
        data.pickupLocation.lat,
        data.pickupLocation.lng,
        data.dropoffLocation.lat,
        data.dropoffLocation.lng
      );
      
      finalDuration = this.calculateDuration(finalDistance);
      etaSource = 'fallback-haversine';
      
      console.log(`📍 [Fallback] Auto-calculated: distance=${finalDistance.toFixed(2)}km, duration=${finalDuration}min`);
    }
    
    return this.fallbackCalculatePrice({
      ...data,
      distance: finalDistance,
      duration: finalDuration,
      etaSource: etaSource,
    });
  }

  async adjustRequestCount(zone, delta) {
    let lastError;

    for (let i = 0; i <= this.retries; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/internal/requests/adjust`,
          { zone, delta },
          {
            timeout: this.timeout,
            headers: { "Content-Type": "application/json" },
            ...(httpsAgent ? { httpsAgent } : {}),
          },
        );

        return response.data;
      } catch (error) {
        lastError = error;
        if (i < this.retries) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    console.warn(
      `⚠️ Failed to adjust request count for zone ${zone} by ${delta}:`,
      lastError?.message,
    );
    return null;
  }

  async getCurrentSurge(zone) {
    try {
      const response = await axios.get(
        `${this.baseURL}/internal/surge/${zone}`,
        {
          timeout: this.timeout,
          ...(httpsAgent ? { httpsAgent } : {}),
        },
      );
      return response.data?.data || null;
    } catch (error) {
      console.warn(`⚠️ Failed to get current surge for zone ${zone}:`, error.message);
      return null;
    }
  }

  fallbackCalculatePrice(data) {
    const { distance, duration, vehicleType, etaSource } = data;

    let type = vehicleType;
    if (vehicleType === "car_4") type = "car";
    if (vehicleType === "car_7") type = "suv";
    if (vehicleType === "motorbike") type = "bike";

    const basePrices = {
      car: 10000,
      suv: 15000,
      bike: 5000,
    };

    const perKmPrices = {
      car: 5000,
      suv: 7000,
      bike: 3000,
    };

    const perMinutePrices = {
      car: 1000,
      suv: 1200,
      bike: 500,
    };

    const basePrice = basePrices[type] || 10000;
    const perKmRate = perKmPrices[type] || 5000;
    const perMinuteRate = perMinutePrices[type] || 1000;

    const distancePrice = (distance || 0) * perKmRate;
    const timePrice = (duration || 0) * perMinuteRate;
    const total = Math.round(basePrice + distancePrice + timePrice);

    return {
      basePrice: basePrice,
      distancePrice: Math.round(distancePrice),
      timePrice: Math.round(timePrice),
      surgeMultiplier: 1.0,
      total: total,
      currency: "VND",
      isFallback: true,
      distance: distance || 0,
      duration: duration || 0,
      etaSource: etaSource || 'fallback',
    };
  }
}

module.exports = PricingClient;