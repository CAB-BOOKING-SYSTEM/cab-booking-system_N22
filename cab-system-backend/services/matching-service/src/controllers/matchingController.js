const matchingService = require('../services/matchingService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class MatchingController {
  async findDriver(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { rideId, userId, pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = req.body;

      const result = await matchingService.findDriverForRide(
        rideId,
        userId,
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
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
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false,
          errors: errors.array() 
        });
      }

      const { rideId } = req.params;
      const result = await matchingService.getMatchResult(rideId);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy kết quả ghép đôi',
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

  async getMatchingStats(req, res) {
    try {
      const stats = await matchingService.getMatchingStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get matching stats error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async healthCheck(req, res) {
    const aiAvailable = await matchingService.checkAIAvailability();
    res.json({
      status: 'healthy',
      service: 'matching-service',
      aiAvailable: aiAvailable,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  }
}

module.exports = new MatchingController();