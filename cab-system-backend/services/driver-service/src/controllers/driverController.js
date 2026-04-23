const driverService = require('../services/driverService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class DriverController {
  
  async updateProfile(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const driverId = req.user.driverId;
      const updateData = req.body;

      const driver = await driverService.updateDriverProfile(driverId, updateData);
      
      res.json({
        success: true,
        message: 'Cập nhật hồ sơ thành công',
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

      const publicData = {
        driverId: driver.driverId,
        fullName: driver.fullName,
        vehicleType: driver.vehicleType,
        licensePlate: driver.licensePlate,
        rating: driver.rating,
        status: driver.status,
        currentLocation: driver.currentLocation
      };

      res.json({
        success: true,
        data: publicData,
      });
    } catch (error) {
      logger.error('Get driver info error:', error);
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  async toggleStatus(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const driverId = req.user.driverId;
      const { status } = req.body;

      const driver = await driverService.updateDriverStatus(driverId, status);
      
      res.json({
        success: true,
        message: `Tài xế đã ${status === 'online' ? 'lên xe' : 'xuống xe'}`,
        data: {
          driverId: driver.driverId,
          status: driver.status,
          currentLocation: driver.currentLocation
        },
      });
    } catch (error) {
      logger.error('Toggle status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error',
      });
    }
  }

  async getLocationHistory(req, res) {
    try {
      const driverId = req.user.driverId;
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

      const publicDrivers = drivers.map(d => ({
        driverId: d.driverId,
        fullName: d.fullName,
        vehicleType: d.vehicleType,
        rating: d.rating,
        currentLocation: d.currentLocation,
        distanceKm: d.distanceKm
      }));

      res.json({
        success: true,
        count: publicDrivers.length,
        data: publicDrivers,
      });
    } catch (error) {
      logger.error('Get online drivers error:', error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  async acceptRide(req, res) {
    try {
      const driverId = req.user.driverId;
      const { rideId } = req.body;

      const result = await driverService.acceptRide(driverId, rideId);
      
      res.json({
        success: true,
        message: 'Nhận chuyến thành công',
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
      const driverId = req.user.driverId;
      const { rideId } = req.body;

      const result = await driverService.rejectRide(driverId, rideId);
      
      res.json({
        success: true,
        message: 'Từ chối chuyến thành công',
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
      const driverId = req.user.driverId;
      const { rideId } = req.body;

      const result = await driverService.startRide(driverId, rideId);
      
      res.json({
        success: true,
        message: 'Bắt đầu chuyến thành công',
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

      const driverId = req.user.driverId;
      const { rideId, distance, duration } = req.body;

      const driver = await driverService.completeRide(driverId, rideId, distance, duration);
      
      res.json({
        success: true,
        message: 'Kết thúc chuyến thành công',
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

  async getDriverEarnings(req, res) {
    try {
      const driverId = req.user.driverId;
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
      const driverId = req.user.driverId;
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
      const driverId = req.user.driverId;
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

  async getWallet(req, res) {
    try {
      const driverId = req.user.driverId;
      const walletService = require('../services/walletService');
      const wallet = await walletService.getWallet(driverId);
      
      res.json({
        success: true,
        data: {
          driverId: wallet.driverId,
          balance: wallet.balance,
          totalEarned: wallet.totalEarned,
          totalWithdrawn: wallet.totalWithdrawn,
          pendingWithdraw: wallet.pendingWithdraw,
          updatedAt: wallet.updatedAt
        }
      });
    } catch (error) {
      logger.error('Get wallet error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async requestWithdraw(req, res) {
    try {
      const driverId = req.user.driverId;
      const { amount, bankAccount } = req.body;
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
      }
      
      const walletService = require('../services/walletService');
      const result = await walletService.requestWithdraw(driverId, amount, bankAccount);
      
      res.json(result);
    } catch (error) {
      logger.error('Request withdraw error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getTransactionHistory(req, res) {
    try {
      const driverId = req.user.driverId;
      const { page = 1, limit = 20 } = req.query;
      
      const walletService = require('../services/walletService');
      const history = await walletService.getTransactionHistory(driverId, parseInt(page), parseInt(limit));
      
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Get transaction history error:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // 🔥 THÊM METHOD NÀY VÀO CUỐI, TRƯỚC module.exports
  async internalCreateDriver(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { driverId, email, phone, fullName, vehicleType, licensePlate } = req.body;

      const existingDriver = await driverService.getDriverById(driverId);
      if (existingDriver) {
        return res.status(200).json({
          success: true,
          message: 'Driver already exists',
          data: existingDriver
        });
      }

      const driver = await driverService.createDriver({
        driverId: String(driverId),
        email: email,
        phone: phone || '',
        fullName: fullName,
        licensePlate: licensePlate || `TEMP${Date.now()}`,
        vehicleType: vehicleType || '4_seat',
        status: 'offline',
        rating: 5.0,
        totalTrips: 0
      });

      const walletService = require('../services/walletService');
      await walletService.createWallet(driverId);

      logger.info(`✅ Internal: Driver created for user ${driverId}`);
      
      res.status(201).json({
        success: true,
        message: 'Driver created successfully',
        data: driver
      });
    } catch (error) {
      logger.error('Internal create driver error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DriverController();