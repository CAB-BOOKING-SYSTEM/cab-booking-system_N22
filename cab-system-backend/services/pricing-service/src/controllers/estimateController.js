const estimateService = require('../services/estimateService');
const { successResponse, errorResponse } = require('../utils/responseUtil');

const estimateFare = async (req, res) => {
  try {
    const result = await estimateService.calculateEstimate(req.body);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = { estimateFare };