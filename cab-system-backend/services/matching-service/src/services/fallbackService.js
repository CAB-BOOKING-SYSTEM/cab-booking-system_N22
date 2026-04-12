 const logger = require('../utils/logger');

class FallbackService {
  async nearestDriverMatch(nearbyDrivers, driverDetailsMap) {
    try {
      if (!nearbyDrivers || nearbyDrivers.length === 0) {
        return null;
      }

      // Simply take the closest driver
      const nearest = nearbyDrivers[0];
      const driverDetails = driverDetailsMap[nearest.driverId];

      if (!driverDetails || driverDetails.status !== 'online') {
        // Try next closest
        for (let i = 1; i < nearbyDrivers.length; i++) {
          const nextDriver = nearbyDrivers[i];
          const nextDetails = driverDetailsMap[nextDriver.driverId];
          if (nextDetails && nextDetails.status === 'online') {
            return {
              driverId: nextDriver.driverId,
              distanceKm: nextDriver.distanceKm,
              totalScore: 0,
              details: nextDetails,
              fallback: true,
              fallbackReason: 'nearest_driver',
            };
          }
        }
        return null;
      }

      return {
        driverId: nearest.driverId,
        distanceKm: nearest.distanceKm,
        totalScore: 0,
        details: driverDetails,
        fallback: true,
        fallbackReason: 'nearest_driver',
      };
    } catch (error) {
      logger.error('Fallback matching error:', error);
      return null;
    }
  }

  async ruleBasedMatch(nearbyDrivers, driverDetailsMap, rules = {}) {
    const { minRating = 4.0, maxDistanceKm = 10 } = rules;
    
    let bestDriver = null;
    let bestScore = -1;

    for (const nearby of nearbyDrivers) {
      const driver = driverDetailsMap[nearby.driverId];
      if (!driver || driver.status !== 'online') continue;
      if (driver.rating < minRating) continue;
      if (nearby.distanceKm > maxDistanceKm) continue;

      // Simple scoring: distance (40%) + rating (60%)
      const distanceScore = Math.max(0, 1 - nearby.distanceKm / maxDistanceKm);
      const ratingScore = driver.rating / 5;
      const totalScore = distanceScore * 0.4 + ratingScore * 0.6;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestDriver = {
          driverId: nearby.driverId,
          distanceKm: nearby.distanceKm,
          totalScore,
          details: driver,
          fallback: true,
          fallbackReason: 'rule_based',
        };
      }
    }

    return bestDriver;
  }
}

module.exports = new FallbackService();
