const surgeRepository = require('../repositories/surgeRepository');
const { successResponse, errorResponse } = require('../utils/responseUtil');

const getAllSurges = async (req, res) => {
  try {
    const surges = await surgeRepository.getAllSurgeZones();
    return successResponse(res, surges);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const getSurgeByZone = async (req, res) => {
  try {
    const multiplier = await surgeRepository.getSurge(req.params.zone);
    return successResponse(res, { zone: req.params.zone, multiplier });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const createSurge = async (req, res) => {
  try {
    const surge = await surgeRepository.createSurge(req.body.zone, req.body.multiplier);
    return successResponse(res, surge, 201);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const updateSurge = async (req, res) => {
  try {
    const surge = await surgeRepository.updateSurge(req.params.zone, req.body.multiplier);
    return successResponse(res, surge);
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

const deleteSurge = async (req, res) => {
  try {
    const deleted = await surgeRepository.deleteSurge(req.params.zone);
    if (!deleted) {
      return errorResponse(res, 'Zone not found', 404);
    }
    return successResponse(res, { message: 'Deleted successfully' });
  } catch (error) {
    return errorResponse(res, error.message);
  }
};

module.exports = {
  getAllSurges,
  getSurgeByZone,
  createSurge,
  updateSurge,
  deleteSurge
};