const axios = require('axios');
const logger = require('../utils/logger');

class FeatureStoreService {
  constructor() {
    this.featureStoreUrl = process.env.FEATURE_STORE_URL || 'http://feature-store:8080';
    this.cache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  async getDriverFeatures(driverId) {
    try {
      // Check cache first
      const cached = this.getFromCache(driverId);
      if (cached) {
        return cached;
      }

      // In production, call actual feature store
      // const response = await axios.get(`${this.featureStoreUrl}/drivers/${driverId}/features`);
      // const features = response.data;
      
      // Simulate features for now
      const features = {
        driverId,
        rating: await this.getDriverRating(driverId),
        acceptanceRate: await this.getDriverAcceptanceRate(driverId),
        avgResponseTime: await this.getDriverAvgResponseTime(driverId),
        completedTrips: await this.getDriverCompletedTrips(driverId),
        cancellationRate: await this.getDriverCancellationRate(driverId),
        lastActiveAt: new Date().toISOString(),
      };

      this.addToCache(driverId, features);
      return features;
    } catch (error) {
      logger.error(`Error getting features for driver ${driverId}:`, error);
      return this.getDefaultFeatures(driverId);
    }
  }

  async getMultipleDriverFeatures(driverIds) {
    const features = {};
    await Promise.all(
      driverIds.map(async (driverId) => {
        features[driverId] = await this.getDriverFeatures(driverId);
      })
    );
    return features;
  }

  async getDriverRating(driverId) {
    // In production, call Driver Service API
    try {
      const response = await axios.get(`${process.env.DRIVER_SERVICE_URL}/api/drivers/${driverId}`);
      return response.data.rating || 5.0;
    } catch (error) {
      logger.warn(`Failed to get rating for ${driverId}, using default`);
      return 5.0;
    }
  }

  async getDriverAcceptanceRate(driverId) {
    // Simulate - in production, calculate from historical data
    return 0.92;
  }

  async getDriverAvgResponseTime(driverId) {
    // Simulate - in production, calculate from historical data
    return 25;
  }

  async getDriverCompletedTrips(driverId) {
    // Simulate - in production, get from Driver Service
    try {
      const response = await axios.get(`${process.env.DRIVER_SERVICE_URL}/api/drivers/${driverId}`);
      return response.data.totalTrips || 0;
    } catch (error) {
      return 0;
    }
  }

  async getDriverCancellationRate(driverId) {
    // Simulate
    return 0.05;
  }

  getDefaultFeatures(driverId) {
    return {
      driverId,
      rating: 5.0,
      acceptanceRate: 0.9,
      avgResponseTime: 30,
      completedTrips: 0,
      cancellationRate: 0.1,
    };
  }

  getFromCache(driverId) {
    const cached = this.cache.get(driverId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }
    return null;
  }

  addToCache(driverId, data) {
    this.cache.set(driverId, {
      data,
      timestamp: Date.now(),
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

module.exports = new FeatureStoreService(); 
