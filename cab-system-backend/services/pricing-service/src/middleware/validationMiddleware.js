// ==================== PRICING VALIDATION ====================
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

// ==================== SURGE VALIDATION ====================
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

// ==================== ESTIMATE VALIDATION (CHO BOOKING SERVICE) ====================
const validateEstimate = (req, res, next) => {
  const { pickupLocation, dropoffLocation, vehicleType, distance, duration } = req.body;
  const errors = [];

  // Kiểm tra pickupLocation
  if (!pickupLocation) errors.push('Pickup location is required');
  if (pickupLocation && !pickupLocation.lat) errors.push('Pickup latitude is required');
  if (pickupLocation && !pickupLocation.lng) errors.push('Pickup longitude is required');
  
  // Kiểm tra dropoffLocation
  if (!dropoffLocation) errors.push('Dropoff location is required');
  if (dropoffLocation && !dropoffLocation.lat) errors.push('Dropoff latitude is required');
  if (dropoffLocation && !dropoffLocation.lng) errors.push('Dropoff longitude is required');
  
  if (!vehicleType) errors.push('Vehicle type is required');
  if (!distance || distance <= 0) errors.push('Distance must be > 0');
  if (!duration || duration <= 0) errors.push('Duration must be > 0');

  // Kiểm tra vehicleType hợp lệ
  const validTypes = ['car_4', 'car_7', 'bike', 'car', 'suv'];
  if (vehicleType && !validTypes.includes(vehicleType)) {
    errors.push('Vehicle type must be car_4, car_7, or bike');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

// ==================== PROMOTION VALIDATION ====================
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

// ==================== PROMOTION CREATION VALIDATION ====================
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

  // Kiểm tra ngày hợp lệ
  if (validFrom && validTo && new Date(validFrom) > new Date(validTo)) {
    errors.push('Valid from date must be before valid to date');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

// ==================== INTERNAL API VALIDATION ====================
const validateDriverUpdate = (req, res, next) => {
  const { zone, count } = req.body;
  const errors = [];

  if (!zone) errors.push('Zone is required');
  if (count === undefined) errors.push('Count is required');
  if (count !== undefined && count < 0) errors.push('Count must be >= 0');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

const validateRequestUpdate = (req, res, next) => {
  const { zone, count } = req.body;
  const errors = [];

  if (!zone) errors.push('Zone is required');
  if (count === undefined) errors.push('Count is required');
  if (count !== undefined && count < 0) errors.push('Count must be >= 0');

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }

  next();
};

// ==================== EXPORT ====================
module.exports = {
  validatePricing,
  validateSurge,
  validateEstimate,
  validatePromotionApply,
  validatePromotionCreation,
  validateDriverUpdate,
  validateRequestUpdate
};