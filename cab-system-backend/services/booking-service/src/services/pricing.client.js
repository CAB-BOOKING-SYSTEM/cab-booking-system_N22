// src/services/pricing.client.js
const axios = require('axios');

class PricingClient {
  constructor(config) {
    this.baseURL = config.pricingService.url;
    this.timeout = config.pricingService.timeout;
    this.retries = config.pricingService.retries;
  }
  
  async estimatePrice(data) {
    let lastError;
    
    for (let i = 0; i <= this.retries; i++) {
      try {
        const response = await axios.post(`${this.baseURL}/api/v1/pricing/estimate`, data, {
          timeout: this.timeout,
          headers: { 'Content-Type': 'application/json' }
        });
        
        return response.data;
      } catch (error) {
        lastError = error;
        console.warn(`Pricing estimate attempt ${i + 1} failed:`, error.message);
        
        if (i < this.retries) {
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // Fallback: calculate price locally if Pricing Service is down
    console.warn('⚠️ Pricing Service unavailable, using fallback calculation');
    return this.fallbackCalculatePrice(data);
  }
  
  fallbackCalculatePrice(data) {
    const { distance, duration, vehicleType } = data;
    
    const basePrices = {
      'car_4': 20000,
      'car_7': 25000,
      'motorbike': 10000
    };
    
    const perKmPrices = {
      'car_4': 10000,
      'car_7': 12000,
      'motorbike': 5000
    };
    
    const basePrice = basePrices[vehicleType] || 20000;
    const perKmPrice = perKmPrices[vehicleType] || 10000;
    
    const distancePrice = (distance || 0) * perKmPrice;
    const timePrice = (duration || 0) * 1000;
    const total = basePrice + distancePrice + timePrice;
    
    return {
      basePrice,
      distancePrice,
      timePrice,
      surgeMultiplier: 1.0,
      total,
      currency: 'VND',
      isFallback: true
    };
  }
}

module.exports = PricingClient;