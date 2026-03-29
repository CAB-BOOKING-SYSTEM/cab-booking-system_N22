const validatePricing = (req, res, next) => {
  const { vehicleType, baseFare, perKmRate, perMinuteRate } = req.body;
  const errors = [];

  if (!vehicleType) errors.push('Vehicle type is required');
  if (!baseFare || baseFare <= 0) errors.push('Base fare must be > 0');
  if (!perKmRate || perKmRate <= 0) errors.push('Per km rate must be > 0');
  if (!perMinuteRate || perMinuteRate <= 0) errors.push('Per minute rate must be > 0');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const validateSurge = (req, res, next) => {
  const { zone, multiplier } = req.body;
  const errors = [];

  if (!zone) errors.push('Zone is required');
  if (!multiplier || multiplier <= 0) errors.push('Multiplier must be > 0');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const validateEstimate = (req, res, next) => {
  const { vehicleType, distance, duration, zone } = req.body;
  const errors = [];

  if (!vehicleType) errors.push('Vehicle type is required');
  if (!distance || distance <= 0) errors.push('Distance must be > 0');
  if (!duration || duration <= 0) errors.push('Duration must be > 0');
  if (!zone) errors.push('Zone is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const validatePromotionApply = (req, res, next) => {
  const { code, tripValue, vehicleType, zone } = req.body;
  const errors = [];

  if (!code) errors.push('Promotion code is required');
  if (!tripValue || tripValue <= 0) errors.push('Trip value must be > 0');
  if (!vehicleType) errors.push('Vehicle type is required');
  if (!zone) errors.push('Zone is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const validatePromotionCreation = (req, res, next) => {
  const { code, type, value, validFrom, validTo } = req.body;
  const errors = [];

  if (!code) errors.push('Promotion code is required');
  if (!type || !['fixed', 'percentage'].includes(type)) {
    errors.push('Type must be "fixed" or "percentage"');
  }
  if (!value || value <= 0) errors.push('Value must be > 0');
  if (!validFrom) errors.push('Valid from date is required');
  if (!validTo) errors.push('Valid to date is required');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

module.exports = {
  validatePricing,
  validateSurge,
  validateEstimate,
  validatePromotionApply,
  validatePromotionCreation
};