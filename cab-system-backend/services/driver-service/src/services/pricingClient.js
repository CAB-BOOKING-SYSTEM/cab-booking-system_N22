const axios = require("axios");
const logger = require("../utils/logger");
const mtls = require("../../../../../shared/mtls.cjs");

const httpsAgent = mtls.createClientAgent();

class PricingClient {
  constructor() {
    this.baseURL = process.env.PRICING_SERVICE_URL || "http://cab_pricing:3006";
    this.timeout = 5000;
    this.retries = 3;
  }

  async updateDriverCount(zone, count) {
    let lastError;
    for (let i = 0; i <= this.retries; i++) {
      try {
        const response = await axios.post(
          `${this.baseURL}/internal/drivers/update`,
          { zone, count },
          {
            timeout: this.timeout,
            headers: { "Content-Type": "application/json" },
            ...(httpsAgent ? { httpsAgent } : {}),
          },
        );
        logger.info(`✅ Updated driver count for ${zone}: ${count}`);
        return response.data;
      } catch (error) {
        lastError = error;
        if (i < this.retries) {
          const delay = Math.pow(2, i) * 1000;
          logger.warn(
            `Retry ${i + 1}/${this.retries} for pricing update in ${delay}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    logger.warn(
      `⚠️ Failed to update driver count for ${zone}:`,
      lastError?.message,
    );
    return null;
  }

  determineZone(lat, lng) {
    if (!lat || !lng) return "SUBURB";
    if (lat >= 21.0 && lat <= 21.05 && lng >= 105.83 && lng <= 105.87) {
      return "CENTER";
    }
    if (lat >= 21.2 && lat <= 21.25 && lng >= 105.78 && lng <= 105.82) {
      return "AIRPORT";
    }
    return "SUBURB";
  }
}

module.exports = new PricingClient();
