const matchingService = require('../services/matchingService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class MatchingController {
  async findDriver(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rideId, userId, pickupLat, pickupLng, vehicleType } = req.body;

      const result = await matchingService.findDriverForRide(
        rideId,
        userId,
        pickupLat,
        pickupLng,
        vehicleType
      );

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);
    } catch (error) {
      logger.error('Find driver error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getMatchResult(req, res) {
    try {
      const { rideId } = req.params;
      const result = await matchingService.getMatchResult(rideId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Match result not found',
        });
      }

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Get match result error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async healthCheck(req, res) {
    res.json({
      status: 'healthy',
      service: 'matching-service',
      aiAvailable: true,
      timestamp: new Date().toISOString(),
    });
  }
}

module.exports = new MatchingController(); 
