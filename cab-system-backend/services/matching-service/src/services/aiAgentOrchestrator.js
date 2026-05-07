/**
 * AI Agent Orchestrator
 *
 * An intelligent agent that coordinates AI model calls (ETA, Pricing, Fraud)
 * and makes multi-objective driver selection decisions.
 *
 * Covers:
 * - TC44: Returns exactly Top-3 drivers
 * - TC47: AI latency < 200ms (timeout + fallback)
 * - TC49/TC60: Fallback to rule-based when AI fails
 * - TC51: Agent picks nearest driver
 * - TC52: Agent considers rating (not just distance)
 * - TC53: Agent balances ETA vs Price (multi-objective)
 * - TC54: Agent calls correct tools (ETA vs Pricing)
 * - TC55: Agent handles missing context gracefully
 * - TC56: Agent retries on service error
 * - TC57: Agent filters out offline drivers
 * - TC58: Agent logs decisions with trace_id
 * - TC59: Stateless design for parallel request handling
 */

const axios = require('axios');
const logger = require('../utils/logger');

const AI_PLATFORM_URL = process.env.AI_MODEL_ENDPOINT || 'http://ai-model:8080';
const AI_TIMEOUT_MS = 180; // TC47: must be < 200ms
const MAX_RETRIES = 2;     // TC56: retry on failure

class AIAgentOrchestrator {
  constructor() {
    this.toolCallLog = [];
  }

  /**
   * Main entry point: orchestrate driver matching for a ride request.
   * This method is STATELESS (TC59) — all state is local to the call.
   *
   * @param {Object} params
   * @param {string} params.traceId - Unique trace ID for logging (TC58)
   * @param {Array}  params.drivers - List of candidate drivers with { driverId, distanceKm }
   * @param {Object} params.featuresMap - Map of driverId -> feature data
   * @param {Object} params.driverDetailsMap - Map of driverId -> { data: { status, rating, ... } }
   * @param {Object} params.rideContext - { pickupLat, pickupLng, dropoffLat, dropoffLng }
   * @param {number} params.topN - Number of top drivers to return (default: 3)
   * @returns {Object} { success, drivers, meta }
   */
  async orchestrate(params) {
    const {
      traceId,
      drivers,
      featuresMap,
      driverDetailsMap,
      rideContext = {},
      topN = 3,
    } = params;

    const startTime = Date.now();
    const decisionLog = [];

    const log = (msg) => {
      const entry = `[${traceId}] ${msg}`;
      decisionLog.push(entry);
      logger.info(entry);
    };

    log(`🤖 Agent started. Candidates: ${drivers.length}, TopN: ${topN}`);

    // ─── STEP 1: Filter offline drivers (TC57) ─────────────
    const onlineDrivers = drivers.filter((d) => {
      const details = driverDetailsMap[d.driverId];
      const status = details?.data?.status;
      if (status !== 'online') {
        log(`❌ Excluding driver ${d.driverId}: status=${status || 'unknown'} (offline/unavailable)`);
        return false;
      }
      return true;
    });

    if (onlineDrivers.length === 0) {
      log('⚠️ No online drivers available after filtering.');
      return {
        success: false,
        drivers: [],
        meta: {
          traceId,
          decisionLog,
          latencyMs: Date.now() - startTime,
          usedFallback: false,
          reason: 'no_online_drivers',
        },
      };
    }

    log(`✅ Online drivers after filter: ${onlineDrivers.length}`);

    // ─── STEP 2: Try AI Model Scoring (TC47, TC49, TC60) ───
    let scoredDrivers = null;
    let usedFallback = false;
    let modelVersion = 'fallback';

    try {
      log('📡 Calling AI Platform /predict/matching...');
      const aiResult = await this.callAIMatchingWithRetry(
        traceId,
        onlineDrivers,
        featuresMap,
        driverDetailsMap,
        topN
      );
      scoredDrivers = aiResult.top_drivers;
      modelVersion = aiResult.model_version;
      log(`✅ AI returned ${scoredDrivers.length} scored drivers (model: ${modelVersion})`);
    } catch (aiError) {
      log(`⚠️ AI Platform failed: ${aiError.message}. Falling back to rule-based.`);
      usedFallback = true;
    }

    // ─── STEP 3: Fallback rule-based scoring (TC49, TC60) ──
    if (!scoredDrivers || scoredDrivers.length === 0) {
      usedFallback = true;
      log('🔄 Using rule-based multi-objective fallback...');
      scoredDrivers = this.ruleBasedMultiObjectiveScore(
        onlineDrivers,
        featuresMap,
        driverDetailsMap,
        topN
      );
      log(`✅ Fallback returned ${scoredDrivers.length} drivers`);
    }

    // ─── STEP 4: Enrich with ETA and Pricing (TC54) ────────
    if (rideContext.dropoffLat && rideContext.dropoffLng) {
      try {
        log('📡 Calling AI Platform /predict/eta (TC54: correct tool selection)...');
        const etaResult = await this.callETAWithRetry(traceId, rideContext);
        log(`✅ ETA prediction: ${etaResult.eta_minutes} min`);

        // Attach ETA to top driver for response
        // Code mới siêu tường minh
        for (const sd of scoredDrivers) {
          sd.waiting_eta_minutes = sd.eta_minutes; // Giữ lại ETA rước khách
          sd.trip_eta_minutes = etaResult.eta_minutes; // Thêm ETA chuyến đi
          sd.eta_minutes = etaResult.eta_minutes; // Giữ nguyên để tương thích Frontend cũ
        }

      } catch (etaErr) {
        log(`⚠️ ETA prediction failed: ${etaErr.message}. Using distance-based estimate.`);
      }
    } else {
      log('ℹ️ No dropoff coordinates. Skipping ETA call (TC55: handling missing context).');
    }

    // ─── STEP 5: Log final decision (TC58) ─────────────────
    for (let i = 0; i < scoredDrivers.length; i++) {
      const d = scoredDrivers[i];
      const features = featuresMap[d.driver_id] || {};
      // Code log mới
      log(
        `📊 #${i + 1} Driver ${d.driver_id}: ` +
        `score=${d.match_score}, dist=${d.distance_km}km, ` +
        `waiting_eta=${d.waiting_eta_minutes}min, trip_eta=${d.trip_eta_minutes}min`
      );

    }

    if (scoredDrivers.length >= 2) {
      const top = scoredDrivers[0];
      const second = scoredDrivers[1];
      log(
        `🏆 Decision: Selected ${top.driver_id} over ${second.driver_id} ` +
        `because score ${top.match_score} > ${second.match_score} ` +
        `(multi-objective: distance + rating + ETA + price optimization)`
      );
    }

    const totalLatency = Date.now() - startTime;
    log(`⏱️ Total orchestration latency: ${totalLatency}ms`);

    return {
      success: true,
      drivers: scoredDrivers.slice(0, topN),
      meta: {
        traceId,
        modelVersion,
        usedFallback,
        latencyMs: totalLatency,
        candidatesCount: onlineDrivers.length,
        decisionLog,
      },
    };
  }

  /**
   * Call AI Platform /predict/matching with retry (TC56).
   */
  async callAIMatchingWithRetry(traceId, drivers, featuresMap, driverDetailsMap, topN) {
    const payload = {
      drivers: drivers.map((d) => {
        const f = featuresMap[d.driverId] || {};
        const details = driverDetailsMap[d.driverId]?.data || {};
        return {
          driver_id: d.driverId,
          distance_km: d.distanceKm,
          driver_rating: f.rating || details.rating || 5.0,
          acceptance_rate: f.acceptanceRate || 0.9,
          avg_response_time_sec: f.avgResponseTime || 30,
          completed_trips: f.completedTrips || 0,
          eta_minutes: (d.distanceKm / 25) * 60, // rough ETA
          price_estimate: d.distanceKm * 10000,   // rough price
        };
      }),
      top_n: topN,
    };

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(
          `${AI_PLATFORM_URL}/predict/matching`,
          payload,
          { timeout: AI_TIMEOUT_MS }
        );
        return response.data;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          const delay = (attempt + 1) * 50;
          logger.warn(`[${traceId}] AI matching retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError;
  }

  /**
   * Call AI Platform /predict/eta with retry (TC56).
   */
  async callETAWithRetry(traceId, rideContext) {
    const distance = this.haversineDistance(
      rideContext.pickupLat, rideContext.pickupLng,
      rideContext.dropoffLat, rideContext.dropoffLng
    );

    const payload = {
      distance_km: Math.round(distance * 100) / 100,
      hour_of_day: new Date().getHours(),
      day_of_week: new Date().getDay(),
      traffic_index: 0.5,
      is_rain: 0,
    };

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.post(
          `${AI_PLATFORM_URL}/predict/eta`,
          payload,
          { timeout: AI_TIMEOUT_MS }
        );
        return response.data;
      } catch (err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          const delay = (attempt + 1) * 50;
          logger.warn(`[${traceId}] ETA retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    // TC55: Don't crash if ETA fails, just throw to caller
    throw new Error(`ETA prediction failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
  }

  /**
   * Rule-based multi-objective scoring fallback (TC49, TC51-TC53, TC60).
   * Uses weighted formula: distance(30%) + rating(30%) + acceptance(15%) + response(15%) + experience(10%)
   */
  ruleBasedMultiObjectiveScore(drivers, featuresMap, driverDetailsMap, topN) {
    const scored = drivers.map((d) => {
      const f = featuresMap[d.driverId] || {};
      const details = driverDetailsMap[d.driverId]?.data || {};
      const rating = f.rating || details.rating || 5.0;
      const acceptanceRate = f.acceptanceRate || 0.9;
      const avgResponseTime = f.avgResponseTime || 30;
      const completedTrips = f.completedTrips || 0;

      // Multi-objective scoring (TC51: distance, TC52: rating, TC53: balanced)
      const distScore = Math.max(0, 1 - d.distanceKm / 15);
      const ratingScore = (rating - 3.0) / 2.0;
      const acceptScore = acceptanceRate;
      const responseScore = Math.max(0, 1 - avgResponseTime / 120);
      const expScore = Math.min(1, completedTrips / 1000);

      const matchScore =
        distScore * 0.30 +
        ratingScore * 0.30 +
        acceptScore * 0.15 +
        responseScore * 0.15 +
        expScore * 0.10;

      return {
        driver_id: d.driverId,
        match_score: Math.round(Math.max(0, Math.min(1, matchScore)) * 10000) / 10000,
        distance_km: d.distanceKm,
        driver_rating: rating,
        eta_minutes: Math.round((d.distanceKm / 25) * 60 * 10) / 10,
        price_estimate: Math.round(d.distanceKm * 10000),
      };
    });

    scored.sort((a, b) => b.match_score - a.match_score);
    return scored.slice(0, topN);
  }

  /**
   * Haversine formula to calculate distance between two GPS points.
   */
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}

module.exports = new AIAgentOrchestrator();
