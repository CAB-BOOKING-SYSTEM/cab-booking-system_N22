const axios = require('axios');
const logger = require('../utils/logger');
const scoringAlgorithm = require('../utils/scoringAlgorithm');

const AI_PLATFORM_URL = process.env.AI_MODEL_ENDPOINT || 'http://ai-model:8080';
const AI_HEALTH_TIMEOUT_MS = 2000;

class AIScoringService {
  constructor() {
    this.aiAvailable = false; // Start as false, check on first call
    this._lastHealthCheck = 0;
    this._healthCheckInterval = 30000; // 30 seconds
  }

  async scoreDriver(driver, distanceKm, features) {
    try {
      // Simulate AI scoring (in production, call actual AI model)
      const score = scoringAlgorithm.calculateScore(
        distanceKm,
        features.rating,
        features.acceptanceRate,
        features.avgResponseTime,
        features.completedTrips
      );

      // Thêm một số yếu tố khác
      const finalScore = this.applyAdvancedFactors(score, features, driver);

      return {
        driverId: driver.driverId,
        distanceKm,
        rating: features.rating,
        acceptanceRate: features.acceptanceRate,
        totalScore: finalScore,
        details: driver.details,
        aiUsed: true,
      };
    } catch (error) {
      logger.error('AI scoring error:', error);
      throw error;
    }
  }

  async scoreMultipleDrivers(drivers, featuresMap, driverDetailsMap) {
    const scored = [];
    
    for (const driver of drivers) {
      try {
        const features = featuresMap[driver.driverId] || {
          rating: 5.0,
          acceptanceRate: 0.9,
          avgResponseTime: 30,
          completedTrips: 0,
        };
        
        const driverWithDetails = {
          driverId: driver.driverId,
          details: driverDetailsMap[driver.driverId]?.data || {},
          distanceKm: driver.distanceKm,
        };
        
        const scoredDriver = await this.scoreDriver(
          driverWithDetails,
          driver.distanceKm,
          features
        );
        scored.push(scoredDriver);
      } catch (error) {
        logger.error(`Error scoring driver ${driver.driverId}:`, error);
      }
    }

    // Sort by score descending
    scored.sort((a, b) => b.totalScore - a.totalScore);
    return scored;
  }

  applyAdvancedFactors(baseScore, features, driver) {
    let finalScore = baseScore;
    
    // Bonus cho tài xế có rating cao
    if (features.rating >= 4.8) {
      finalScore += 0.05;
    }
    
    // Bonus cho tài xế có tỷ lệ nhận chuyến cao
    if (features.acceptanceRate >= 0.95) {
      finalScore += 0.03;
    }
    
    // Phạt nếu khoảng cách xa
    if (driver.distanceKm > 3) {
      finalScore -= 0.05;
    }
    
    return Math.min(1.0, Math.max(0, finalScore));
  }

  async checkAIAvailability() {
    const now = Date.now();
    // Cache health check result for 30 seconds
    if (now - this._lastHealthCheck < this._healthCheckInterval) {
      return this.aiAvailable;
    }

    try {
      const response = await axios.get(`${AI_PLATFORM_URL}/health`, {
        timeout: AI_HEALTH_TIMEOUT_MS,
      });
      this.aiAvailable = response.status === 200;
      this._lastHealthCheck = now;
      if (this.aiAvailable) {
        logger.debug(`AI Platform health check OK: ${JSON.stringify(response.data.models_loaded)}`);
      }
      return this.aiAvailable;
    } catch (error) {
      logger.warn('AI Platform health check failed:', error.message);
      this.aiAvailable = false;
      this._lastHealthCheck = now;
      return false;
    }
  }

  setAIAvailable(available) {
    this.aiAvailable = available;
  }
}

module.exports = new AIScoringService();