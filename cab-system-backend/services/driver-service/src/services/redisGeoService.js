 const redisClient = require('../config/redis');
const logger = require('../utils/logger');

class RedisGeoService {
  async updateDriverLocation(driverId, lat, lng, status = 'online') {
    try {
      const redis = redisClient.getClient();
      
      if (status === 'online') {
        await redis.geoadd('drivers:location', lng, lat, driverId);
        await redis.hset(`driver:${driverId}`, {
          lat: lat.toString(),
          lng: lng.toString(),
          status,
          lastUpdate: Date.now().toString(),
        });
        await redis.expire(`driver:${driverId}`, 300);
        logger.debug(`Updated location for driver ${driverId}`);
      } else {
        await redis.zrem('drivers:location', driverId);
        logger.debug(`Removed driver ${driverId} from geo index`);
      }
    } catch (error) {
      logger.error('Error updating driver location in Redis:', error);
      throw error;
    }
  }

  async getNearbyDrivers(lat, lng, radiusKm = 5, vehicleType = null) {
    try {
      const redis = redisClient.getClient();
      const nearby = await redis.georadius(
        'drivers:location',
        lng,
        lat,
        radiusKm,
        'km',
        'WITHDIST',
        'ASC'
      );

      let drivers = nearby.map(([driverId, distance]) => ({
        driverId,
        distanceKm: parseFloat(distance),
      }));

      // Filter by vehicle type if specified
      if (vehicleType) {
        const filtered = [];
        for (const driver of drivers) {
          const info = await redis.hgetall(`driver:${driver.driverId}`);
          if (info && info.vehicleType === vehicleType) {
            filtered.push(driver);
          }
        }
        drivers = filtered;
      }

      return drivers;
    } catch (error) {
      logger.error('Error getting nearby drivers:', error);
      return [];
    }
  }

  async isDriverOnline(driverId) {
    try {
      const redis = redisClient.getClient();
      const exists = await redis.zscore('drivers:location', driverId);
      return exists !== null;
    } catch (error) {
      logger.error('Error checking driver online status:', error);
      return false;
    }
  }
}

module.exports = new RedisGeoService();
