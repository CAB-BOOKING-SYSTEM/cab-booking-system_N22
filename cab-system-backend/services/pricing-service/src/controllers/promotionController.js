const promotionService = require('../services/promotionService');
const promotionRepository = require('../repositories/promotionRepository');
const { successResponse, errorResponse } = require('../utils/responseUtil');

// THÊM HÀM NÀY
const getPromotionByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const promotion = await promotionRepository.getPromotionByCode(code);
    
    if (!promotion) {
      return errorResponse(res, 'Promotion not found', 404);
    }
    
    return successResponse(res, promotion);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const applyPromotion = async (req, res) => {
  try {
    const { code, tripValue, vehicleType, zone } = req.body;
    const result = await promotionService.applyPromotion(code, tripValue, vehicleType, zone);
    return successResponse(res, result);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getAllPromotions = async (req, res) => {
  try {
    const promotions = await promotionRepository.getAllPromotions();
    return successResponse(res, promotions);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createPromotion = async (req, res) => {
  try {
    const promotion = await promotionRepository.createPromotion(req.body);
    return successResponse(res, promotion, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updatePromotion = async (req, res) => {
  try {
    const promotion = await promotionRepository.updatePromotion(req.params.code, req.body);
    if (!promotion) {
      return errorResponse(res, 'Promotion not found', 404);
    }
    return successResponse(res, promotion);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deletePromotion = async (req, res) => {
  try {
    const result = await promotionRepository.deletePromotion(req.params.code);
    if (result.deletedCount === 0) {
      return errorResponse(res, 'Promotion not found', 404);
    }
    return successResponse(res, { message: 'Promotion deleted successfully' });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getPromotionByCode,  // THÊM DÒNG NÀY
  applyPromotion,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion
};