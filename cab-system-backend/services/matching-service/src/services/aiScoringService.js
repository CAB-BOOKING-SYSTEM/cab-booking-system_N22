const logger = require('../utils/logger');
const scoringAlgorithm = require('../utils/scoringAlgorithm');

class AIScoringService {
  constructor() {
    this.aiAvailable = true;
    this.modelEndpoint = process.env.AI_MODEL_ENDPOINT || 'http://ai-model:8080';
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
    // In production, check health of AI model endpoint
    try {
      // const response = await axios.get(`${this.modelEndpoint}/health`, { timeout: 2000 });
      // this.aiAvailable = response.status === 200;
      return this.aiAvailable;
    } catch (error) {
      logger.warn('AI model health check failed:', error.message);
      this.aiAvailable = false;
      return false;
    }
  }

  setAIAvailable(available) {
    this.aiAvailable = available;
  }
}

module.exports = new AIScoringService();