const axios = require("axios");
const MatchingRequest = require("../models/MatchingRequest");
const MatchingResult = require("../models/MatchingResult");
const redisClient = require("../config/redis");
const aiScoringService = require("./aiScoringService");
const fallbackService = require("./fallbackService");
const featureStoreService = require("./featureStoreService");
const pricingClient = require("./pricingClient");
const logger = require("../utils/logger");
const mtls = require("../../../../../shared/mtls.cjs");

const httpsAgent = mtls.createClientAgent();

class MatchingService {
  constructor() {
    this.driverServiceUrl =
      process.env.DRIVER_SERVICE_URL || "http://cab_driver:3003";
    this.matchTimeout = 30000;
  }

  async findDriverForRide(
    rideId,
    userId,
    pickupLat,
    pickupLng,
    dropoffLat = null,
    dropoffLng = null,
    vehicleType = null,
  ) {
    const startTime = Date.now();
    logger.info(
      `🎯 Finding driver for ride ${rideId} at (${pickupLat}, ${pickupLng})`,
    );

    try {
      let etaMinutes = 5;
      let etaSeconds = 300;

      if (dropoffLat && dropoffLng) {
        try {
          const etaData = await pricingClient.getETA(
            pickupLat,
            pickupLng,
            dropoffLat,
            dropoffLng,
          );
          etaMinutes = etaData.eta_minutes;
          etaSeconds = etaData.eta_seconds;
          logger.info(
            `📊 ETA calculated: ${etaMinutes} minutes, distance: ${etaData.distance_km}km`,
          );
        } catch (error) {
          logger.warn("ETA calculation failed, using default", error.message);
        }
      }

      const pool = require("../config/database").getPGPool();
      const request = await MatchingRequest.create(pool, {
        rideId,
        userId,
        pickupLat,
        pickupLng,
      });

      logger.info(`📝 Matching request created: ${request.id}`);

      const nearbyDrivers = await redisClient.getNearbyDrivers(
        pickupLng,
        pickupLat,
        5,
      );

      if (nearbyDrivers.length === 0) {
        await MatchingRequest.updateStatus(pool, rideId, "failed");
        logger.warn(`⚠️ No nearby drivers found for ride ${rideId}`);
        return {
          success: false,
          error: "Không có tài xế nào ở gần",
        };
      }

      logger.info(
        `📍 Found ${nearbyDrivers.length} nearby drivers for ride ${rideId}`,
      );

      const driverDetailsMap = await this.getDriverDetails(
        nearbyDrivers.map((d) => d.driverId),
      );

      const onlineDrivers = nearbyDrivers.filter(
        (d) =>
          driverDetailsMap[d.driverId] &&
          driverDetailsMap[d.driverId].data?.status === "online",
      );

      if (onlineDrivers.length === 0) {
        await MatchingRequest.updateStatus(pool, rideId, "failed");
        logger.warn(`⚠️ No online drivers found for ride ${rideId}`);
        return {
          success: false,
          error: "Không có tài xế trực tuyến",
        };
      }

      logger.info(`✅ Found ${onlineDrivers.length} online drivers`);

      let filteredDrivers = onlineDrivers;
      if (vehicleType) {
        filteredDrivers = onlineDrivers.filter(
          (d) =>
            driverDetailsMap[d.driverId]?.data?.vehicleType === vehicleType,
        );
        logger.info(
          `🚗 Filtered to ${filteredDrivers.length} drivers with vehicle type ${vehicleType}`,
        );
      }

      if (filteredDrivers.length === 0) {
        await MatchingRequest.updateStatus(pool, rideId, "failed");
        return {
          success: false,
          error: `Không có tài xế loại xe ${vehicleType} ở gần`,
        };
      }

      const featuresMap = await featureStoreService.getMultipleDriverFeatures(
        filteredDrivers.map((d) => d.driverId),
      );

      let matchedDriver = null;
      let usedFallback = false;
      let aiAvailable = await aiScoringService.checkAIAvailability();

      try {
        if (aiAvailable) {
          const scoredDrivers = await aiScoringService.scoreMultipleDrivers(
            filteredDrivers,
            featuresMap,
            driverDetailsMap,
          );

          if (scoredDrivers.length > 0) {
            matchedDriver = scoredDrivers[0];
            logger.info(
              `🤖 AI matched driver ${matchedDriver.driverId} with score ${matchedDriver.totalScore}`,
            );
          } else {
            throw new Error("No drivers scored by AI");
          }
        } else {
          throw new Error("AI service unavailable");
        }
      } catch (aiError) {
        logger.warn(
          `⚠️ AI failed for ride ${rideId}, using fallback:`,
          aiError.message,
        );
        usedFallback = true;

        matchedDriver = await fallbackService.nearestDriverMatch(
          filteredDrivers,
          driverDetailsMap,
        );

        if (!matchedDriver) {
          matchedDriver = await fallbackService.ruleBasedMatch(
            filteredDrivers,
            driverDetailsMap,
          );
        }

        if (matchedDriver) {
          logger.info(`🔄 Fallback matched driver ${matchedDriver.driverId}`);
        }
      }

      if (!matchedDriver) {
        await MatchingRequest.updateStatus(pool, rideId, "failed");
        return {
          success: false,
          error: "Không thể tìm được tài xế phù hợp",
        };
      }

      const result = await MatchingResult.create(pool, {
        requestId: request.id,
        driverId: matchedDriver.driverId,
        distanceKm: matchedDriver.distanceKm,
        aiScore: matchedDriver.totalScore || null,
        wasFallback: usedFallback,
      });

      logger.info(`💾 Saved match result: ${result.id}`);

      const driverDetails =
        driverDetailsMap[matchedDriver.driverId]?.data || {};
      const matchResult = {
        rideId,
        driverId: matchedDriver.driverId,
        driverName: driverDetails.fullName,
        driverPhone: driverDetails.phone,
        distanceKm: matchedDriver.distanceKm,
        vehicleType: driverDetails.vehicleType,
        vehiclePlate: driverDetails.licensePlate,
        driverRating: driverDetails.rating || 5.0,
        estimatedArrivalSec: etaSeconds,
        etaMinutes: etaMinutes,
        usedFallback,
        aiScore: matchedDriver.totalScore,
        matchedAt: new Date().toISOString(),
      };

      await redisClient.cacheMatchResult(rideId, matchResult, 300);
      await MatchingRequest.updateStatus(pool, rideId, "matched");

      const duration = Date.now() - startTime;
      logger.info(
        `✅ Matching completed for ride ${rideId} in ${duration}ms, ETA: ${etaMinutes} min`,
      );

      this.publishMatchEvent(matchResult).catch((err) => {
        logger.error("Failed to publish match event:", err);
      });

      return {
        success: true,
        data: matchResult,
        meta: {
          matchingTimeMs: duration,
          candidatesCount: filteredDrivers.length,
          usedFallback,
          aiAvailable,
          etaMinutes,
        },
      };
    } catch (error) {
      logger.error(`❌ Matching error for ride ${rideId}:`, error);
      return {
        success: false,
        error: error.message || "Internal server error",
      };
    }
  }

  async getDriverDetails(driverIds) {
    const detailsMap = {};

    await Promise.all(
      driverIds.map(async (driverId) => {
        try {
          const response = await axios.get(
            `${this.driverServiceUrl}/api/drivers/${driverId}`,
            {
              timeout: 5000,
              ...(httpsAgent ? { httpsAgent } : {}),
            },
          );
          detailsMap[driverId] = response.data;
          logger.debug(`Fetched details for driver ${driverId}`);
        } catch (error) {
          logger.warn(
            `Failed to get details for driver ${driverId}:`,
            error.message,
          );
          detailsMap[driverId] = null;
        }
      }),
    );

    return detailsMap;
  }

  async publishMatchEvent(matchResult) {
    try {
      logger.info(`📤 Match event published for ride ${matchResult.rideId}`);
    } catch (error) {
      logger.error("Failed to publish match event:", error);
    }
  }

  async getMatchResult(rideId) {
    try {
      const cached = await redisClient.getCachedMatch(rideId);
      if (cached) {
        logger.debug(`Returning cached match result for ride ${rideId}`);
        return cached;
      }

      const pool = require("../config/database").getPGPool();
      const request = await MatchingRequest.findById(pool, rideId);

      if (!request) {
        return null;
      }

      const result = await MatchingResult.findByRequestId(pool, request.id);

      if (result) {
        return {
          rideId,
          driverId: result.driver_id,
          matchedAt: result.matched_at,
          distanceKm: result.distance_km,
          aiScore: result.ai_score,
          wasFallback: result.was_fallback,
        };
      }

      return null;
    } catch (error) {
      logger.error(`Error getting match result for ride ${rideId}:`, error);
      return null;
    }
  }

  async getMatchingStats() {
    try {
      const pool = require("../config/database").getPGPool();

      const statsQuery = `
        SELECT 
          COUNT(*) as total_requests,
          SUM(CASE WHEN status = 'matched' THEN 1 ELSE 0 END) as matched_count,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
          AVG(CASE WHEN status = 'matched' THEN EXTRACT(EPOCH FROM (updated_at - created_at)) END) as avg_matching_time_sec
        FROM matching_requests
        WHERE created_at > NOW() - INTERVAL '24 hours'
      `;

      const result = await pool.query(statsQuery);

      return {
        totalRequests: parseInt(result.rows[0].total_requests) || 0,
        matchedCount: parseInt(result.rows[0].matched_count) || 0,
        failedCount: parseInt(result.rows[0].failed_count) || 0,
        successRate:
          result.rows[0].total_requests > 0
            ? (
                (result.rows[0].matched_count / result.rows[0].total_requests) *
                100
              ).toFixed(2)
            : 0,
        avgMatchingTimeSec:
          parseFloat(result.rows[0].avg_matching_time_sec) || 0,
      };
    } catch (error) {
      logger.error("Error getting matching stats:", error);
      return {
        totalRequests: 0,
        matchedCount: 0,
        failedCount: 0,
        successRate: 0,
        avgMatchingTimeSec: 0,
      };
    }
  }

  async checkAIAvailability() {
    return aiScoringService.checkAIAvailability();
  }
}

module.exports = new MatchingService();
