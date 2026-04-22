const driverService = require('../services/driverService');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

class DriverController {
  // ==================== AUTH & PROFILE ====================
  
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Tìm tài xế theo email
      const driver = await driverService.getDriverByEmail(email);
      
      if (!driver) {
        return res.status(401).json({
          success: false,
          message: 'Email không tồn tại'
        });
      }
      
      // Kiểm tra password (đơn giản cho test)
      if (password !== 'password123' && password !== driver.password) {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu không chính xác'
        });
      }
      
      // Tạo token đơn giản (chỉ để test)
      const token = Buffer.from(JSON.stringify({
        driverId: driver.driverId,
        email: driver.email,
        role: 'driver',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })).toString('base64');
      
      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token: token,
          driverId: driver.driverId,
          email: driver.email,
          role: 'driver'
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error.message || 'Đăng nhập thất bại'
      });
    }
  }

  async register(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, fullName, licensePlate, vehicleType, email } = req.body;
      
      // Kiểm tra tài xế đã tồn tại
      const existingDriver = await driverService.getDriverByPhoneOrEmail(phone, email);
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'Số điện thoại hoặc email đã tồn tại'
        });
      }
      
      // Tạo driverId
      const driverId = `DRV_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      const driver = await driverService.createDriver({
        driverId,
        phone,
        email,
        fullName,
        licensePlate,
        vehicleType
      });
      
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài xế thành công',
        data: driver
      });
    } catch (error) {
      logger.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: error.message
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
        message: `Tài xế đã ${status === 'online' ? 'lên xe' : 'xuống xe'}`,
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
      const { lat, lng, speed, heading, accuracy } = req.body;

      const driver = await driverService.updateDriverLocation(
        driverId,
        lat,
        lng,
        speed || 0,
        heading || 0,
        accuracy || 0
      );

      res.json({
        success: true,
        message: 'Cập nhật vị trí thành công',
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
      const { driverId } = req.params;
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
  // ==================== WALLET MANAGEMENT ====================

  async getWallet(req, res) {
    try {
      const { driverId } = req.params;
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
      const { driverId } = req.params;
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
      const { driverId } = req.params;
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
  async startRide(req, res) {
    try {
      const { driverId } = req.params;
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

      const { driverId } = req.params;
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