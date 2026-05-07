const axios = require('axios');
const { isSurgePhase2Enabled } = require('../config/featureFlags');

const AI_PLATFORM_URL = process.env.AI_MODEL_ENDPOINT || 'http://ai-platform:8080';
const MIN_SURGE = 1.0;
const MAX_SURGE = 3.0;
const DEFAULT_MODEL_VERSION = 'phase1-intelligent-surge-v1';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function getTemporalSignals(now = new Date()) {
  const hourOfDay = now.getHours();
  const dayOfWeek = now.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = isWeekend ? 1 : 0;
  const isPeakHour =
    (hourOfDay >= 7 && hourOfDay <= 9) ||
    (hourOfDay >= 17 && hourOfDay <= 20);

  return {
    hourOfDay,
    dayOfWeek,
    isWeekend,
    isHoliday,
    isPeakHour,
  };
}

function buildDemandFeatures({ zone, supply, demand, now = new Date() }) {
  const temporal = getTemporalSignals(now);
  const safeSupply = Math.max(1, supply);
  const imbalanceRatio = demand / safeSupply;
  const demandPressure = clamp(imbalanceRatio, 0, 10);
  const supplyRatio = clamp(supply / Math.max(supply + demand, 1), 0.01, 1.0);
  const zoneBoost =
    zone === 'AIRPORT' ? 0.18 : zone === 'CENTER' ? 0.12 : 0.05;

  return {
    ...temporal,
    zone,
    supply,
    demand,
    imbalanceRatio,
    demandPressure,
    supplyRatio,
    zoneBoost,
    isEvent:
      zone === 'AIRPORT' && temporal.isPeakHour ? 1 : 0,
  };
}

function computePhase1Surge(input) {
  const features = buildDemandFeatures(input);
  const shortageBoost = Math.max(0, features.imbalanceRatio - 1);
  const peakBoost = features.isPeakHour ? 0.22 : 0;
  const weekendBoost = features.isWeekend ? 0.08 : 0;
  const demandBoost = Math.min(features.demand * 0.04, 0.45);

  let surge =
    1 +
    shortageBoost * 0.65 +
    features.zoneBoost +
    peakBoost +
    weekendBoost +
    demandBoost;

  if (features.supply === 0 && features.demand > 0) {
    surge += 0.4;
  }

  surge = clamp(surge, MIN_SURGE, MAX_SURGE);

  return {
    multiplier: Math.round(surge * 1000) / 1000,
    modelVersion: DEFAULT_MODEL_VERSION,
    source: 'phase1-rule-intelligence',
    features,
  };
}

async function computePhase2Surge(input) {
  const features = buildDemandFeatures(input);
  const response = await axios.post(
    `${AI_PLATFORM_URL}/predict/surge`,
    {
      demand_index: Math.round(features.demandPressure * 1000) / 1000,
      supply_ratio: features.supplyRatio,
      hour_of_day: features.hourOfDay,
      is_holiday: features.isHoliday,
      is_event: features.isEvent,
    },
    {
      timeout: 1500,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  return {
    multiplier: clamp(response.data.surge_multiplier, MIN_SURGE, MAX_SURGE),
    modelVersion: response.data.model_version || 'surge-ai-unknown',
    source: 'phase2-ai-platform',
    features,
    aiLatencyMs: response.data.latency_ms,
  };
}

async function computeSurge(input, options = {}) {
  const preferAI =
    options.preferAI ?? isSurgePhase2Enabled();

  if (preferAI) {
    try {
      return await computePhase2Surge(input);
    } catch (error) {
      const fallback = computePhase1Surge(input);
      return {
        ...fallback,
        source: 'phase2-fallback-to-phase1',
        fallbackReason: error.message,
      };
    }
  }

  return computePhase1Surge(input);
}

module.exports = {
  buildDemandFeatures,
  computePhase1Surge,
  computePhase2Surge,
  computeSurge,
  getTemporalSignals,
};
