 
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

  async addDriverLocation(driverId, lng, lat) {
    await this.client.geoadd('drivers:location', lng, lat, driverId);
    await this.client.hset(`driver:${driverId}`, {
      lng,
      lat,
      lastUpdate: Date.now(),
    });
    await this.client.expire(`driver:${driverId}`, 300); // TTL 5 phút
  }

  async removeDriverLocation(driverId) {
    await this.client.zrem('drivers:location', driverId);
    await this.client.del(`driver:${driverId}`);
  }

  async getNearbyDrivers(lng, lat, radiusKm = 5) {
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
  }

  async close() {
    if (this.client) {
      await this.client.quit();
      logger.info('Redis connection closed');
    }
  }
}

module.exports = new RedisClient();