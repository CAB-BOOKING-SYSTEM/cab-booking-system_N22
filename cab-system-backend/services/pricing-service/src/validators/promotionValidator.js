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

module.exports = { validatePromotionApply };