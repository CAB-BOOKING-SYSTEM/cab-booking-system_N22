const axios = require('axios');
const MatchingRequest = require('../models/MatchingRequest');
const MatchingResult = require('../models/MatchingResult');
const redisClient = require('../config/redis');
const aiScoringService = require('./aiScoringService');
const fallbackService = require('./fallbackService');
const featureStoreService = require('./featureStoreService');
const logger = require('../utils/logger');

class MatchingService {
  constructor() {
    this.driverServiceUrl = process.env.DRIVER_SERVICE_URL || 'http://cab_driver:3003';
  }

  async findDriverForRide(rideId, userId, pickupLat, pickupLng, vehicleType = null) {
    const startTime = Date.now();
    logger.info(`Finding driver for ride ${rideId} at (${pickupLat}, ${pickupLng})`);

    try {
      // Step 1: Save matching request
      const pool = require('../config/database').getPGPool();
      const request = await MatchingRequest.create(pool, {
        rideId,
        userId,
        pickupLat,
        pickupLng,
      });

      // Step 2: Get nearby drivers from Redis Geo
      const nearbyDrivers = await redisClient.getNearbyDrivers(pickupLng, pickupLat, 5);
      
      if (nearbyDrivers.length === 0) {
        await MatchingRequest.updateStatus(pool, rideId, 'failed');
        logger.warn(`No nearby drivers found for ride ${rideId}`);
        return {
          success: false,
          error: 'No drivers available nearby',
        };
      }

      logger.info(`Found ${nearbyDrivers.length} nearby drivers for ride ${rideId}`);

      // Step 3: Get driver details from Driver Service
      const driverDetailsMap = await this.getDriverDetails(nearbyDrivers.map(d => d.driverId));
      
      // Filter online drivers only
      const onlineDrivers = nearbyDrivers.filter(d => 
        driverDetailsMap[d.driverId] && driverDetailsMap[d.driverId].status === 'online'
      );

      if (onlineDrivers.length === 0) {
        await MatchingRequest.updateStatus(pool, rideId, 'failed');
        return {
          success: false,
          error: 'No online drivers available',
        };
      }

      // Step 4: Get driver features from Feature Store
      const featuresMap = await featureStoreService.getMultipleDriverFeatures(
        onlineDrivers.map(d => d.driverId)
      );

      // Step 5: AI Scoring or Fallback
      let matchedDriver = null;
      let usedFallback = false;
      let aiAvailable = aiScoringService.checkAIAvailability();

      try {
        if (aiAvailable) {
          // AI Mode
          const scoredDrivers = await aiScoringService.scoreMultipleDrivers(
            onlineDrivers,
            featuresMap
          );
          
          if (scoredDrivers.length > 0) {
            matchedDriver = scoredDrivers[0];
            logger.info(`AI matched driver ${matchedDriver.driverId} with score ${matchedDriver.totalScore}`);
          } else {
            throw new Error('No drivers scored by AI');
          }
        } else {
          throw new Error('AI service unavailable');
        }
      } catch (aiError) {
        // FALLBACK: AI failed, use rule-based
        logger.warn(`AI failed for ride ${rideId}, using fallback:`, aiError.message);
        usedFallback = true;
        
        matchedDriver = await fallbackService.nearestDriverMatch(onlineDrivers, driverDetailsMap);
        
        if (!matchedDriver) {
          matchedDriver = await fallbackService.ruleBasedMatch(onlineDrivers, driverDetailsMap);
        }
        
        if (matchedDriver) {
          logger.info(`Fallback matched driver ${matchedDriver.driverId}`);
        }
      }

      if (!matchedDriver) {
        await MatchingRequest.updateStatus(pool, rideId, 'failed');
        return {
          success: false,
          error: 'Could not find suitable driver',
        };
      }

      // Step 6: Save matching result
      const result = await MatchingResult.create(pool, {
        requestId: request.id,
        driverId: matchedDriver.driverId,
        distanceKm: matchedDriver.distanceKm,
        aiScore: matchedDriver.totalScore || null,
        wasFallback: usedFallback,
      });

      // Step 7: Cache result in Redis
      const matchResult = {
        rideId,
        driverId: matchedDriver.driverId,
        driverName: matchedDriver.details?.fullName,
        driverPhone: matchedDriver.details?.phone,
        distanceKm: matchedDriver.distanceKm,
        vehicleType: matchedDriver.details?.vehicleType,
        driverRating: matchedDriver.details?.rating,
        estimatedArrivalSec: Math.ceil(matchedDriver.distanceKm * 2 * 60),
        usedFallback,
        matchedAt: new Date().toISOString(),
      };
      
      await redisClient.cacheMatchResult(rideId, matchResult, 300);
      await MatchingRequest.updateStatus(pool, rideId, 'matched');

      const duration = Date.now() - startTime;
      logger.info(`Matching completed for ride ${rideId} in ${duration}ms`);

      // Step 8: Publish to Kafka/RabbitMQ (optional)
      await this.publishMatchEvent(matchResult);

      return {
        success: true,
        data: matchResult,
      };
    } catch (error) {
      logger.error(`Matching error for ride ${rideId}:`, error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getDriverDetails(driverIds) {
    const detailsMap = {};
    
    await Promise.all(
      driverIds.map(async (driverId) => {
        try {
          const response = await axios.get(`${this.driverServiceUrl}/api/drivers/${driverId}`);
          detailsMap[driverId] = response.data;
        } catch (error) {
          logger.warn(`Failed to get details for driver ${driverId}:`, error.message);
          detailsMap[driverId] = null;
        }
      })
    );
    
    return detailsMap;
  }

  async publishMatchEvent(matchResult) {
    try {
      // In production, publish to Kafka/RabbitMQ
      // const channel = require('../config/rabbitmq').getChannel();
      // channel.publish('ride.exchange', 'ride.matched', Buffer.from(JSON.stringify(matchResult)));
      
      logger.info(`Match event published for ride ${matchResult.rideId}`);
    } catch (error) {
      logger.error('Failed to publish match event:', error);
    }
  }

  async getMatchResult(rideId) {
    try {
      // Check cache first
      const cached = await redisClient.getCachedMatch(rideId);
      if (cached) {
        return cached;
      }

      // Check database
      const pool = require('../config/database').getPGPool();
      const result = await MatchingResult.findByRideId(pool, rideId);
      
      if (result) {
        return result;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error getting match result for ride ${rideId}:`, error);
      return null;
    }
  }
}

module.exports = new MatchingService(); 
