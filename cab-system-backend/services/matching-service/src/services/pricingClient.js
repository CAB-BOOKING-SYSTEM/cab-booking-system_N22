const axios = require('axios');
const logger = require('../utils/logger');

class PricingClient {
  constructor() {
    this.baseURL = process.env.PRICING_SERVICE_URL || 'http://cab_pricing:3006';
    this.timeout = 5000;
    this.retries = 3;
  }

  async getETA(pickupLat, pickupLng, dropoffLat, dropoffLng) {
    let lastError;
    
    for (let i = 0; i <= this.retries; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/api/v1/eta`,
          { pickupLat, pickupLng, dropoffLat, dropoffLng },
          { timeout: this.timeout }
        );
        logger.info(`✅ ETA from Pricing: ${response.data.data?.eta_minutes} min`);
        return response.data.data;
      } catch (error) {
        lastError = error;
        if (i < this.retries) {
          const delay = Math.pow(2, i) * 1000;
          logger.warn(`ETA retry ${i + 1}/${this.retries} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    logger.warn('⚠️ Pricing ETA failed, using fallback calculation');
    const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    const etaMinutes = Math.ceil(distance * 2);
    const etaSeconds = etaMinutes * 60;
    
    return {
      distance_km: Math.round(distance * 10) / 10,
      eta_minutes: etaMinutes,
      eta_seconds: etaSeconds,
      traffic_level: 0.5,
      speed_kph: 30,
      isFallback: true
    };
  }

  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

module.exports = new PricingClient();