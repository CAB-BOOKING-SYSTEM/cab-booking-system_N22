const logger = require('../utils/logger');

class FallbackService {
  async nearestDriverMatch(nearbyDrivers, driverDetailsMap) {
    try {
      if (!nearbyDrivers || nearbyDrivers.length === 0) {
        return null;
      }

      // Simply take the closest driver
      for (const driver of nearbyDrivers) {
        const driverDetails = driverDetailsMap[driver.driverId]?.data;
        
        if (driverDetails && driverDetails.status === 'online') {
          logger.info(`Nearest driver match: ${driver.driverId} at ${driver.distanceKm}km`);
          return {
            driverId: driver.driverId,
            distanceKm: driver.distanceKm,
            totalScore: 0,
            details: driverDetails,
            fallback: true,
            fallbackReason: 'nearest_driver',
          };
        }
      }
      
      return null;
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
      const driver = driverDetailsMap[nearby.driverId]?.data;
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

    if (bestDriver) {
      logger.info(`Rule-based match: ${bestDriver.driverId} with score ${bestScore}`);
    }
    
    return bestDriver;
  }

  async weightedRandomMatch(nearbyDrivers, driverDetailsMap) {
    // Phân phối đều tài xế để tránh quá tải
    const eligibleDrivers = [];
    let totalWeight = 0;
    
    for (const nearby of nearbyDrivers) {
      const driver = driverDetailsMap[nearby.driverId]?.data;
      if (driver && driver.status === 'online') {
        // Trọng số dựa trên rating và khoảng cách
        const weight = (driver.rating / 5) * (1 / (nearby.distanceKm + 1));
        eligibleDrivers.push({ driver: nearby, weight });
        totalWeight += weight;
      }
    }
    
    if (eligibleDrivers.length === 0) return null;
    
    // Random selection based on weight
    let random = Math.random() * totalWeight;
    for (const item of eligibleDrivers) {
      if (random < item.weight) {
        const driver = driverDetailsMap[item.driver.driverId].data;
        return {
          driverId: item.driver.driverId,
          distanceKm: item.driver.distanceKm,
          totalScore: item.weight,
          details: driver,
          fallback: true,
          fallbackReason: 'weighted_random',
        };
      }
      random -= item.weight;
    }
    
    return null;
  }
}

module.exports = new FallbackService();