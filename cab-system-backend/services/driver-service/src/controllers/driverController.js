const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const logger = require('../utils/logger');

class DriverController {
  // ==================== AUTH & PROFILE ====================
  
  async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Tìm tài xế theo email từ database
      const query = `SELECT * FROM drivers WHERE email = $1`;
      const result = await db.query(query, [email]);
      const driver = result.rows[0];
      
      if (!driver) {
        return res.status(401).json({
          success: false,
          message: 'Email không tồn tại'
        });
      }
      
      // Kiểm tra password (đơn giản cho test)
      if (password !== 'password123') {
        return res.status(401).json({
          success: false,
          message: 'Mật khẩu không chính xác'
        });
      }
      
      // Tạo token đơn giản (chỉ để test)
      const token = Buffer.from(JSON.stringify({
        driverId: driver.driver_id,
        email: driver.email,
        role: 'driver',
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      })).toString('base64');
      
      res.json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          token: token,
          driverId: driver.driver_id,
          email: driver.email,
          role: 'driver'
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
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

      const { phone, fullName, licensePlate, vehicleType, email, authUserId } = req.body;
      
      // Kiểm tra tài xế đã tồn tại theo email
      const checkQuery = `SELECT * FROM drivers WHERE email = $1`;
      const existingResult = await db.query(checkQuery, [email]);
      
      if (existingResult.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email đã tồn tại'
        });
      }
      
      // Tạo driverId UUID
      const driverId = uuidv4();
      
      // Tạo driver mới
      const insertQuery = `
        INSERT INTO drivers (driver_id, auth_user_id, phone, email, full_name, license_plate, vehicle_type, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'offline')
        RETURNING driver_id, phone, email, full_name, vehicle_type, status, created_at
      `;
      
      const values = [
        driverId,
        authUserId || null,
        phone,
        email,
        fullName,
        licensePlate,
        vehicleType
      ];
      
      const result = await db.query(insertQuery, values);
      const driver = result.rows[0];
      
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

      // Lấy driverId từ request (đã được middleware gán)
      const driverId = req.driverId;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }

      const { fullName, vehicleType } = req.body;
      
      const updateFields = [];
      const values = [];
      let paramIndex = 1;
      
      if (fullName) {
        updateFields.push(`full_name = $${paramIndex++}`);
        values.push(fullName);
      }
      
      if (vehicleType) {
        updateFields.push(`vehicle_type = $${paramIndex++}`);
        values.push(vehicleType);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Không có dữ liệu cập nhật'
        });
      }
      
      values.push(driverId);
      const query = `
        UPDATE drivers 
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $${paramIndex}
        RETURNING driver_id, phone, email, full_name, vehicle_type, status
      `;
      
      const result = await db.query(query, values);
      const driver = result.rows[0];
      
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
      // Lấy driverId từ request (đã được middleware gán)
      const driverId = req.driverId;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      const query = `
        SELECT driver_id, phone, email, full_name, license_plate, vehicle_type, 
               status, rating, total_trips, is_verified, created_at
        FROM drivers 
        WHERE driver_id = $1
      `;
      const result = await db.query(query, [driverId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }
      
      res.json({
        success: true,
        data: result.rows[0]
      });
    } catch (error) {
      logger.error('Get driver info error:', error);
      res.status(500).json({
        success: false,
        message: error.message
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

      // Lấy driverId từ request (đã được middleware gán)
      const driverId = req.driverId;
      const { status } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      const query = `
        UPDATE drivers 
        SET status = $1, updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $2
        RETURNING driver_id, status, full_name
      `;
      const result = await db.query(query, [status, driverId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }
      
      const driver = result.rows[0];
      
      res.json({
        success: true,
        message: `Tài xế đã ${status === 'online' ? 'lên xe' : 'xuống xe'}`,
        data: driver
      });
    } catch (error) {
      logger.error('Toggle status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  async getOnlineDrivers(req, res) {
    try {
      const { lat, lng, radius, vehicleType } = req.query;
      
      let query = `
        SELECT driver_id, full_name, phone, vehicle_type, rating, status
        FROM drivers 
        WHERE status = 'online'
      `;
      const values = [];
      
      if (vehicleType) {
        query += ` AND vehicle_type = $${values.length + 1}`;
        values.push(vehicleType);
      }
      
      const result = await db.query(query, values);
      
      res.json({
        success: true,
        count: result.rows.length,
        data: result.rows
      });
    } catch (error) {
      logger.error('Get online drivers error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ==================== RIDE MANAGEMENT ====================

  async acceptRide(req, res) {
    try {
      const driverId = req.driverId;
      const { rideId } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // Cập nhật trạng thái driver thành busy
      const updateQuery = `
        UPDATE drivers 
        SET status = 'busy', updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $1
        RETURNING driver_id, status
      `;
      await db.query(updateQuery, [driverId]);
      
      res.json({
        success: true,
        message: 'Nhận chuyến thành công',
        data: { rideId, driverId, status: 'accepted' }
      });
    } catch (error) {
      logger.error('Accept ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async startRide(req, res) {
    try {
      const driverId = req.driverId;
      const { rideId } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      if (!rideId) {
        return res.status(400).json({
          success: false,
          message: 'Thiếu rideId'
        });
      }
      
      // Kiểm tra driver có tồn tại không
      const checkQuery = `SELECT status FROM drivers WHERE driver_id = $1`;
      const checkResult = await db.query(checkQuery, [driverId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài xế'
        });
      }
      
      // Kiểm tra driver có đang busy không
      if (checkResult.rows[0].status !== 'busy') {
        return res.status(400).json({
          success: false,
          message: 'Tài xế không ở trạng thái busy, không thể bắt đầu chuyến'
        });
      }
      
      res.json({
        success: true,
        message: 'Bắt đầu chuyến thành công',
        data: { rideId, driverId, status: 'in_progress', startedAt: new Date().toISOString() }
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
      const driverId = req.driverId;
      const { rideId, distance, duration } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // Cập nhật lại status thành online
      const updateQuery = `
        UPDATE drivers 
        SET status = 'online', 
            total_trips = total_trips + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE driver_id = $1
        RETURNING driver_id, status, total_trips
      `;
      const result = await db.query(updateQuery, [driverId]);
      const driver = result.rows[0];
      
      res.json({
        success: true,
        message: 'Kết thúc chuyến thành công',
        data: driver
      });
    } catch (error) {
      logger.error('Complete ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ==================== LOCATION HISTORY ====================

  async getLocationHistory(req, res) {
    try {
      const driverId = req.driverId;
      const { startDate, endDate, limit = 100 } = req.query;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // TODO: Implement location history from MongoDB
      res.json({
        success: true,
        data: [],
        count: 0,
        message: 'Location history feature coming soon'
      });
    } catch (error) {
      logger.error('Get location history error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ==================== EARNINGS ====================

  async getDriverEarnings(req, res) {
    try {
      const driverId = req.driverId;
      const { startDate, endDate } = req.query;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // Query earnings từ PostgreSQL
      const query = `
        SELECT * FROM driver_earnings 
        WHERE driver_id = $1 
        ORDER BY week_start DESC
      `;
      const result = await db.query(query, [driverId]);
      
      res.json({
        success: true,
        data: result.rows
      });
    } catch (error) {
      logger.error('Get driver earnings error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ==================== RIDE HISTORY ====================

  async getRideHistory(req, res) {
    try {
      const driverId = req.driverId;
      const { page = 1, limit = 20, status } = req.query;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // TODO: Call Ride Service API
      res.json({
        success: true,
        data: [],
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: 0 
        }
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
      const driverId = req.driverId;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // TODO: Call Ride Service API
      res.json({
        success: true,
        hasCurrentRide: false,
        data: null
      });
    } catch (error) {
      logger.error('Get current ride error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  // ==================== WALLET MANAGEMENT ====================

  async getWallet(req, res) {
    try {
      const driverId = req.driverId;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      // Query wallet từ MongoDB
      const Wallet = require('../models/Wallet');
      let wallet = await Wallet.findOne({ driverId });
      
      if (!wallet) {
        wallet = {
          driverId,
          balance: 0,
          totalEarned: 0,
          totalWithdrawn: 0,
          pendingWithdraw: 0
        };
      }
      
      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      logger.error('Get wallet error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async requestWithdraw(req, res) {
    try {
      const driverId = req.driverId;
      const { amount, bankAccount } = req.body;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      if (!amount || amount < 10000) {
        return res.status(400).json({
          success: false,
          message: 'Số tiền rút tối thiểu là 10,000đ'
        });
      }
      
      // TODO: Implement withdraw logic
      res.json({
        success: true,
        message: 'Yêu cầu rút tiền đã được ghi nhận',
        data: { amount, status: 'pending' }
      });
    } catch (error) {
      logger.error('Request withdraw error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  async getTransactionHistory(req, res) {
    try {
      const driverId = req.driverId;
      const { page = 1, limit = 20 } = req.query;
      
      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Không tìm thấy thông tin tài xế từ token'
        });
      }
      
      const Wallet = require('../models/Wallet');
      const wallet = await Wallet.findOne({ driverId });
      
      const transactions = wallet?.transactions || [];
      const startIndex = (parseInt(page) - 1) * parseInt(limit);
      const paginated = transactions.slice(startIndex, startIndex + parseInt(limit));
      
      res.json({
        success: true,
        data: paginated,
        total: transactions.length,
        page: parseInt(page),
        limit: parseInt(limit)
      });
    } catch (error) {
      logger.error('Get transaction history error:', error);
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new DriverController();