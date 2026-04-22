const pricingRepository = require('../repositories/pricingRepository');
const { successResponse, errorResponse } = require('../utils/responseUtil');

const getAllPricing = async (req, res) => {
  try {
    const pricings = await pricingRepository.getAllPricing();
    return successResponse(res, pricings);
  } catch (error) {
    console.error('Error in getAllPricing:', error);
    return errorResponse(res, error.message);
  }
};

const getPricingByVehicle = async (req, res) => {
  try {
    const pricing = await pricingRepository.getPricing(req.params.vehicleType);
    if (!pricing) {
      return errorResponse(res, 'Vehicle type not found', 404);
    }
    return successResponse(res, pricing);
  } catch (error) {
    console.error('Error in getPricingByVehicle:', error);
    return errorResponse(res, error.message);
  }
};

const createPricing = async (req, res) => {
  try {
    const pricing = await pricingRepository.createPricing(req.body);
    return successResponse(res, pricing, 201);
  } catch (error) {
    console.error('Error in createPricing:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      return errorResponse(res, 'Vehicle type already exists');
    }
    return errorResponse(res, error.message);
  }
};

const updatePricing = async (req, res) => {
  try {
    const pricing = await pricingRepository.updatePricing(req.params.vehicleType, req.body);
    if (!pricing) {
      return errorResponse(res, 'Vehicle type not found', 404);
    }
    return successResponse(res, pricing);
  } catch (error) {
    console.error('Error in updatePricing:', error);
    return errorResponse(res, error.message);
  }
};

const deletePricing = async (req, res) => {
  try {
    const deleted = await pricingRepository.deletePricing(req.params.vehicleType);
    if (!deleted) {
      return errorResponse(res, 'Vehicle type not found', 404);
    }
    return successResponse(res, { message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error in deletePricing:', error);
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAllPricing,
  getPricingByVehicle,
  createPricing,
  updatePricing,
  deletePricing
};