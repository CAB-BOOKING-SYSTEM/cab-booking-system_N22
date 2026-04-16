const Redis = require('ioredis');
const logger = require('../utils/logger');

class RedisClient {
  constructor() {
    this.client = null;
  }

  async connect() {
    try {
      this.client = new Redis({
        host: process.env.REDIS_HOST || 'redis',
        port: process.env.REDIS_PORT || 6379,
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      });

      this.client.on('connect', () => {
        logger.info('✅ Redis connected successfully');
      });

      this.client.on('error', (error) => {
        logger.error('❌ Redis error:', error);
      });

      await this.client.ping();
      return this.client;
    } catch (error) {
      logger.error('❌ Redis connection error:', error);
      throw error;
    }
  }

  getClient() {
    if (!this.client) {
      throw new Error('Redis not initialized');
    }
    return this.client;
  }

  async getNearbyDrivers(lng, lat, radiusKm = 5) {
    try {
      const nearby = await this.client.georadius(
        'drivers:location',
        lng,
        lat,
        radiusKm,
        'km',
        'WITHDIST',
        'ASC'
      );
      return nearby.map(([driverId, distance]) => ({
        driverId,
        distanceKm: parseFloat(distance),
      }));
    } catch (error) {
      logger.error('Error getting nearby drivers from Redis:', error);
      return [];
    }
  }

  async cacheMatchResult(rideId, matchResult, ttlSeconds = 300) {
    try {
      await this.client.setex(
        `match:${rideId}`,
        ttlSeconds,
        JSON.stringify(matchResult)
      );
      logger.debug(`Cached match result for ride ${rideId}`);
    } catch (error) {
      logger.error(`Error caching match result for ride ${rideId}:`, error);
    }
  }

  async getCachedMatch(rideId) {
    try {
      const cached = await this.client.get(`match:${rideId}`);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error(`Error getting cached match for ride ${rideId}:`, error);
      return null;
    }
  }

  async deleteCachedMatch(rideId) {
    try {
      await this.client.del(`match:${rideId}`);
      logger.debug(`Deleted cached match for ride ${rideId}`);
    } catch (error) {
      logger.error(`Error deleting cached match for ride ${rideId}:`, error);
    }
  }

  async close() {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }
}

module.exports = new RedisClient();