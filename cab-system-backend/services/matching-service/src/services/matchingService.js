const axios = require("axios");
const crypto = require("crypto");
const MatchingRequest = require("../models/MatchingRequest");
const MatchingResult = require("../models/MatchingResult");
const redisClient = require("../config/redis");
const aiScoringService = require("./aiScoringService");
const fallbackService = require("./fallbackService");
const featureStoreService = require("./featureStoreService");
const pricingClient = require("./pricingClient");
const aiAgent = require("./aiAgentOrchestrator");
const logger = require("../utils/logger");
const mtls = require("../../../../../shared/mtls.cjs");

const httpsAgent = mtls.createClientAgent();

class MatchingService {
  constructor() {
    this.driverServiceUrl =
      process.env.DRIVER_SERVICE_URL || "http://cab_driver:3003";
    this.matchTimeout = 30000;
  }

  /**
   * Find the best driver for a ride request.
   * Now uses AI Agent Orchestrator for multi-objective matching (TC44, TC51-TC60).
   * Generates a trace_id for full decision logging (TC58).
   */
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
    // TC58: Generate unique trace_id for this request
    const traceId = `trace_${crypto.randomUUID()}`;

    logger.info(
      `[${traceId}] 🎯 Finding driver for ride ${rideId} at (${pickupLat}, ${pickupLng})`,
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
            `[${traceId}] 📊 ETA calculated: ${etaMinutes} minutes, distance: ${etaData.distance_km}km`,
          );
        } catch (error) {
          logger.warn(
            `[${traceId}] ETA calculation failed, using default`,
            error.message,
          );
        }
      }

      const pool = require("../config/database").getPGPool();
      const request = await MatchingRequest.create(pool, {
        rideId,
        userId,
        pickupLat,
        pickupLng,
      });

      logger.info(`[${traceId}] 📝 Matching request created: ${request.id}`);

      const nearbyDrivers = await redisClient.getNearbyDrivers(
        pickupLng,
        pickupLat,
        5,
      );

      if (nearbyDrivers.length === 0) {
        await MatchingRequest.updateStatus(pool, rideId, "failed");
        logger.warn(
          `[${traceId}] ⚠️ No nearby drivers found for ride ${rideId}`,
        );
        return {
          success: false,
          error: "Không có tài xế nào ở gần",
        };
      }

      logger.info(
        `[${traceId}] 📍 Found ${nearbyDrivers.length} nearby drivers for ride ${rideId}`,
      );

      const driverDetailsMap = await this.getDriverDetails(
        nearbyDrivers.map((d) => d.driverId),
      );

      // TC57: Filter offline drivers is done INSIDE aiAgent.orchestrate()
      // but we also pre-filter by vehicle type here
      let filteredDrivers = nearbyDrivers;
      if (vehicleType) {
        filteredDrivers = nearbyDrivers.filter(
          (d) =>
            driverDetailsMap[d.driverId]?.data?.vehicleType === vehicleType,
        );
        logger.info(
          `[${traceId}] 🚗 Filtered to ${filteredDrivers.length} drivers with vehicle type ${vehicleType}`,
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

      // ──── AI Agent Orchestration (TC44, TC47-TC60) ────
      const agentResult = await aiAgent.orchestrate({
        traceId,
        drivers: filteredDrivers,
        featuresMap,
        driverDetailsMap,
        rideContext: { pickupLat, pickupLng, dropoffLat, dropoffLng },
        topN: 3, // TC44: always return top 3
      });

      if (!agentResult.success || agentResult.drivers.length === 0) {
        // If agent also fails, try legacy fallback as last resort
        logger.warn(
          `[${traceId}] ⚠️ Agent returned no results, trying legacy fallback`,
        );

        const legacyMatch = await fallbackService.ruleBasedMatch(
          filteredDrivers,
          driverDetailsMap,
        );

        if (!legacyMatch) {
          await MatchingRequest.updateStatus(pool, rideId, "failed");
          return {
            success: false,
            error: "Không thể tìm được tài xế phù hợp",
          };
        }

        // Save and return legacy result
        const result = await MatchingResult.create(pool, {
          requestId: request.id,
          driverId: legacyMatch.driverId,
          distanceKm: legacyMatch.distanceKm,
          aiScore: legacyMatch.totalScore || null,
          wasFallback: true,
        });

        const matchResult = this.buildMatchResult(
          rideId,
          userId, // 👉 BẮT BUỘC THÊM DÒNG NÀY (để app biết gửi cho khách hàng nào)
          legacyMatch.driverId,
          driverDetailsMap,
          legacyMatch,
          etaSeconds,
          etaMinutes,
          true,
          traceId,
        );

        await redisClient.cacheMatchResult(rideId, matchResult, 300);
        await MatchingRequest.updateStatus(pool, rideId, "matched");

        return {
          success: true,
          data: matchResult,
          meta: {
            traceId,
            matchingTimeMs: Date.now() - startTime,
            candidatesCount: filteredDrivers.length,
            usedFallback: true,
            aiAvailable: false,
            etaMinutes,
          },
        };
      }

      // ──── Use Agent's top-1 driver as matched driver ────
      const topDriver = agentResult.drivers[0];
      const usedFallback = agentResult.meta.usedFallback;

      const result = await MatchingResult.create(pool, {
        requestId: request.id,
        driverId: topDriver.driver_id,
        distanceKm: topDriver.distance_km,
        aiScore: topDriver.match_score,
        wasFallback: usedFallback,
      });

      logger.info(`[${traceId}] 💾 Saved match result: ${result.id}`);

      const driverDetails = driverDetailsMap[topDriver.driver_id]?.data || {};
      const matchResult = {
        rideId,
        userId, // 👉 THÊM DÒNG NÀY VÀO ĐÂY
        driverId: topDriver.driver_id,
        driverName: driverDetails.fullName,
        driverPhone: driverDetails.phone,
        distanceKm: topDriver.distance_km,
        vehicleType: driverDetails.vehicleType,
        vehiclePlate: driverDetails.licensePlate,
        driverRating: topDriver.driver_rating || driverDetails.rating || 5.0,
        estimatedArrivalSec: etaSeconds,
        etaMinutes: topDriver.eta_minutes || etaMinutes,
        usedFallback,
        aiScore: topDriver.match_score,
        modelVersion: agentResult.meta.modelVersion,
        traceId,
        // TC44: Include all top-3 candidates
        topCandidates: agentResult.drivers.map((d, i) => ({
          rank: i + 1,
          driverId: d.driver_id,
          matchScore: d.match_score,
          distanceKm: d.distance_km,
          rating: d.driver_rating,
        })),
        matchedAt: new Date().toISOString(),
      };

      await redisClient.cacheMatchResult(rideId, matchResult, 300);
      await MatchingRequest.updateStatus(pool, rideId, "matched");

      const duration = Date.now() - startTime;
      logger.info(
        `[${traceId}] ✅ Matching completed for ride ${rideId} in ${duration}ms, ` +
          `ETA: ${etaMinutes} min, AI Score: ${topDriver.match_score}, ` +
          `Fallback: ${usedFallback}, Model: ${agentResult.meta.modelVersion}`,
      );

      this.publishMatchEvent(matchResult).catch((err) => {
        logger.error(`[${traceId}] Failed to publish match event:`, err);
      });

      return {
        success: true,
        data: matchResult,
        meta: {
          traceId,
          matchingTimeMs: duration,
          candidatesCount: filteredDrivers.length,
          usedFallback,
          aiAvailable: !usedFallback,
          modelVersion: agentResult.meta.modelVersion,
          etaMinutes,
          decisionLog: agentResult.meta.decisionLog,
        },
      };
    } catch (error) {
      logger.error(`[${traceId}] ❌ Matching error for ride ${rideId}:`, error);
      return {
        success: false,
        error: error.message || "Internal server error",
      };
    }
  }

  buildMatchResult(
    rideId,
    driverId,
    driverDetailsMap,
    driverData,
    etaSec,
    etaMin,
    fallback,
    traceId,
  ) {
    const driverDetails = driverDetailsMap[driverId]?.data || {};
    return {
      rideId,
      driverId,
      driverName: driverDetails.fullName,
      driverPhone: driverDetails.phone,
      distanceKm: driverData.distanceKm || driverData.distance_km,
      vehicleType: driverDetails.vehicleType,
      vehiclePlate: driverDetails.licensePlate,
      driverRating: driverDetails.rating || 5.0,
      estimatedArrivalSec: etaSec,
      etaMinutes: etaMin,
      usedFallback: fallback,
      aiScore: driverData.totalScore || driverData.match_score || 0,
      traceId,
      matchedAt: new Date().toISOString(),
    };
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

  /**
   * Publish DriverMatched event to Event Broker (RabbitMQ).
   * Sequence Diagram Step 10: AI Matching Service → Event Broker: Publish DriverMatched
   * Sequence Diagram Step 11: Event Broker → DriverApp: Notify assignment
   */
  async publishMatchEvent(matchResult) {
    try {
      const amqp = require("amqplib");
      const rabbitmqUrl =
        process.env.RABBITMQ_URL || "amqp://admin:password123@rabbitmq:5672";
      const conn = await amqp.connect(rabbitmqUrl);
      const ch = await conn.createChannel();

      const exchange = "booking.events";
      await ch.assertExchange(exchange, "topic", { durable: true });

      const event = {
        event: "driver.matched",
        timestamp: new Date().toISOString(),
        data: {
          rideId: matchResult.rideId,
          userId: matchResult.userId, //them dong nay
          driverId: matchResult.driverId,
          driverName: matchResult.driverName,
          driverPhone: matchResult.driverPhone,
          vehicleType: matchResult.vehicleType,
          vehiclePlate: matchResult.vehiclePlate,
          driverRating: matchResult.driverRating,
          distanceKm: matchResult.distanceKm,
          etaMinutes: matchResult.etaMinutes,
          aiScore: matchResult.aiScore,
          traceId: matchResult.traceId,
          matchedAt: matchResult.matchedAt,
        },
      };

      ch.publish(
        exchange,
        "driver.matched",
        Buffer.from(JSON.stringify(event)),
        { persistent: true },
      );

      logger.info(
        `📤 DriverMatched event published to Event Broker for ride ${matchResult.rideId}, ` +
          `driver: ${matchResult.driverId}`,
      );

      // Close channel after short delay to ensure message is sent
      setTimeout(() => {
        ch.close().catch(() => {});
        conn.close().catch(() => {});
      }, 500);
    } catch (error) {
      logger.error(
        "Failed to publish DriverMatched event to Event Broker:",
        error.message,
      );
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
