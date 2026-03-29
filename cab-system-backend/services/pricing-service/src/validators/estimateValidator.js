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

module.exports = { validateEstimate };