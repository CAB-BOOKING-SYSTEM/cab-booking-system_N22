 const logger = require('../utils/logger');
const scoringAlgorithm = require('../utils/scoringAlgorithm');

class AIScoringService {
  constructor() {
    this.aiAvailable = true;
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

      return {
        driverId: driver.driverId,
        distanceKm,
        rating: features.rating,
        acceptanceRate: features.acceptanceRate,
        totalScore: score,
        details: driver,
        aiUsed: true,
      };
    } catch (error) {
      logger.error('AI scoring error:', error);
      throw error;
    }
  }

  async scoreMultipleDrivers(drivers, featuresMap) {
    const scored = [];
    
    for (const driver of drivers) {
      try {
        const features = featuresMap[driver.driverId] || {
          rating: 5.0,
          acceptanceRate: 0.9,
          avgResponseTime: 30,
          completedTrips: 0,
        };
        
        const scoredDriver = await this.scoreDriver(
          driver,
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

  checkAIAvailability() {
    // In production, check health of AI model endpoint
    return this.aiAvailable;
  }

  setAIAvailable(available) {
    this.aiAvailable = available;
  }
}

module.exports = new AIScoringService();
