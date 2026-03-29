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

module.exports = { validateSurge };