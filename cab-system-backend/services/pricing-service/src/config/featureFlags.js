const isSurgeFeatureEnabled = () =>
  process.env.SURGE_FEATURE_ENABLED === 'true';

const isSurgePhase2Enabled = () =>
  isSurgeFeatureEnabled() && process.env.SURGE_AI_PHASE2_ENABLED === 'true';

module.exports = {
  isSurgeFeatureEnabled,
  isSurgePhase2Enabled,
};
