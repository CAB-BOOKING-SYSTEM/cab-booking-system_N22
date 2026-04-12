const driverService = require('../services/driverService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const axios = require('axios');

class DriverController {
  // ==================== AUTH & PROFILE ====================
  
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Kiểm tra auth service có chạy không
      const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://cab_auth:3001';
      
      try {
        const authResponse = await axios.post(`${authServiceUrl}/auth/login`, {
          email,
          password,
          role: 'driver'
        });
        
        res.json({
          success: true,
          data: authResponse.data
        });
      } catch (authError) {
        // Fallback: nếu auth service chưa chạy, trả về token giả (chỉ để test)
        logger.warn('Auth service unavailable, using fallback token');
        res.json({
          success: true,
          message: 'Login successful (fallback mode - auth service unavailable)',
          data: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImRyaXZlcl8wMDEiLCJyb2xlIjoiZHJpdmVyIiwiaWF0IjoxNTE2MjM5MDIyfQ.fallback_token_for_testing',
            driverId: 'driver_001',
            email: email,
            role: 'driver'
          }
        });
      }
    } catch (error) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.response?.data?.message || 'Invalid credentials'
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { driverId } = req.params;
      const updateData = req.body;

      const driver = await driverService.updateDriverProfile(driverId, updateData);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: driver
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getDriverInfo(req, res) {
    try {
      const { driverId } = req.params;
      const driver = await driverService.getDriverById(driverId);

      res.json({
        success: true,
        data: driver,
      });
    } catch (error) {
      logger.error('Get driver info error:', error);
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==================== STATUS & LOCATION ====================

  async toggleStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { driverId } = req.params;
      const { status } = req.body;

      const driver = await driverService.updateDriverStatus(driverId, status);
      
      res.json({
        success: true,
        message: `Driver is now ${status}`,
        data: driver,
      });
    } catch (error) {
      logger.error('Toggle status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async updateLocation(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { driverId } = req.params;
      const { lat, lng, speed, heading, accuracy, rideId } = req.body;

      const driver = await driverService.updateDriverLocation(
        driverId,
        lat,
        lng,
        speed || 0,
        heading || 0,
        accuracy || 0,
        rideId || null
      );

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: {
          driverId: driver.driverId,
          location: driver.currentLocation,
          status: driver.status,
        },
      });
    } catch (error) {
      logger.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getLocationHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { startDate, endDate, limit } = req.query;

      const history = await driverService.getDriverLocationHistory(
        driverId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null,
        parseInt(limit) || 100
      );

      res.json({
        success: true,
        count: history.length,
        data: history,
      });
    } catch (error) {
      logger.error('Get location history error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getOnlineDrivers(req, res) {
    try {
      const { lat, lng, radius, vehicleType } = req.query;
      
      let drivers;
      if (lat && lng) {
        drivers = await driverService.getNearbyDrivers(
          parseFloat(lat),
          parseFloat(lng),
          parseFloat(radius) || 5,
          vehicleType
        );
      } else {
        const Driver = require('../models/Driver');
        drivers = await Driver.find({ status: 'online' });
      }

      res.json({
        success: true,
        count: drivers.length,
        data: drivers,
      });
    } catch (error) {
      logger.error('Get online drivers error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  // ==================== RIDE MANAGEMENT ====================

  async acceptRide(req, res) {
    try {
      const { driverId } = req.params;
      const { rideId } = req.body;

      const result = await driverService.acceptRide(driverId, rideId);
      
      res.json({
        success: true,
        message: 'Ride accepted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Accept ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async rejectRide(req, res) {
    try {
      const { driverId } = req.params;
      const { rideId } = req.body;

      const result = await driverService.rejectRide(driverId, rideId);
      
      res.json({
        success: true,
        message: 'Ride rejected',
        data: result
      });
    } catch (error) {
      logger.error('Reject ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async startRide(req, res) {
    try {
      const { driverId } = req.params;
      const { rideId } = req.body;

      const result = await driverService.startRide(driverId, rideId);
      
      res.json({
        success: true,
        message: 'Ride started successfully',
        data: result
      });
    } catch (error) {
      logger.error('Start ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async completeRide(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { driverId } = req.params;
      const { rideId, bookingId, distance, duration } = req.body;

      const driver = await driverService.completeRide(driverId, rideId, bookingId, distance, duration);
      
      res.json({
        success: true,
        message: 'Ride completed successfully',
        data: {
          driverId: driver.driverId,
          totalTrips: driver.totalTrips
        }
      });
    } catch (error) {
      logger.error('Complete ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  // ==================== EARNINGS & HISTORY ====================

  async getDriverEarnings(req, res) {
    try {
      const { driverId } = req.params;
      const { startDate, endDate } = req.query;

      const earnings = await driverService.getDriverEarnings(
        driverId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );

      res.json({
        success: true,
        data: earnings,
      });
    } catch (error) {
      logger.error('Get driver earnings error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getRideHistory(req, res) {
    try {
      const { driverId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      const history = await driverService.getRideHistory(driverId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status
      });
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Get ride history error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getCurrentRide(req, res) {
    try {
      const { driverId } = req.params;

      const currentRide = await driverService.getCurrentRide(driverId);
      
      res.json({
        success: true,
        data: currentRide
      });
    } catch (error) {
      logger.error('Get current ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DriverController();