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
      distance: data.distance,
      duration: data.duration,
      zone: data.zone || "CENTER",
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

        console.log("✅ Pricing response:", pricingData);

        return {
          basePrice: Math.round(pricingData.estimatedFare * 0.3),
          distancePrice: Math.round(pricingData.estimatedFare * 0.5),
          timePrice: Math.round(pricingData.estimatedFare * 0.2),
          surgeMultiplier: pricingData.surgeMultiplier || 1,
          total: pricingData.estimatedFare,
          currency: pricingData.currency || "VND",
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
    return this.fallbackCalculatePrice(data);
  }

  fallbackCalculatePrice(data) {
    const { distance, duration, vehicleType } = data;

    // Map vehicleType để tính giá
    let type = vehicleType;
    if (vehicleType === "car_4") type = "car";
    if (vehicleType === "car_7") type = "suv";
    if (vehicleType === "motorbike") type = "bike";

    // Giá cơ bản theo loại xe (giống pricing service)
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

    // Trả về format GIỐNG HỆT pricing service
    return {
      basePrice: basePrice,
      distancePrice: Math.round(distancePrice),
      timePrice: Math.round(timePrice),
      surgeMultiplier: 1.0,
      total: total,
      currency: "VND",
      isFallback: true,
    };
  }
}

module.exports = PricingClient;
