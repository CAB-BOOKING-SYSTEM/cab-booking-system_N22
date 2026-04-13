const express = require('express');
const { body, param, query } = require('express-validator');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ✅ Public routes (không cần auth)
router.post('/register', [
  body('phone').isMobilePhone().withMessage('Số điện thoại không hợp lệ'),
  body('fullName').notEmpty().withMessage('Họ tên không được để trống'),
  body('licensePlate').notEmpty().withMessage('Biển số xe không được để trống'),
  body('vehicleType').isIn(['4_seat', '7_seat', 'luxury']).withMessage('Loại xe không hợp lệ'),
  body('email').optional().isEmail().withMessage('Email không hợp lệ'),
  body('password').optional().isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự')
], driverController.register);

router.post('/login', [
  body('email').isEmail().withMessage('Email không hợp lệ'),
  body('password').notEmpty().withMessage('Mật khẩu không được để trống'),
], driverController.login);

// ✅ Public route để lấy danh sách tài xế online (cho matching service)
router.get('/online/list', [
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
], driverController.getOnlineDrivers);

// ✅ Protected routes (yêu cầu authentication)
//router.use(authMiddleware);

// Profile
router.put('/:driverId/profile', [
  param('driverId').notEmpty(),
  body('fullName').optional().isString(),
  body('phone').optional(),
  body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']),
], driverController.updateProfile);

router.get('/:driverId', driverController.getDriverInfo);

// Status
router.post('/:driverId/toggle-status', [
  param('driverId').notEmpty(),
  body('status').isIn(['online', 'offline']),
], driverController.toggleStatus);

// Ride management
router.post('/:driverId/accept-ride', [
  param('driverId').notEmpty(),
  body('rideId').notEmpty(),
], driverController.acceptRide);

router.post('/:driverId/reject-ride', [
  param('driverId').notEmpty(),
  body('rideId').notEmpty(),
], driverController.rejectRide);

router.post('/:driverId/start-ride', [
  param('driverId').notEmpty(),
  body('rideId').notEmpty(),
], driverController.startRide);

router.post('/:driverId/complete-ride', [
  param('driverId').notEmpty(),
  body('rideId').notEmpty(),
  body('distance').isFloat({ min: 0 }),
  body('duration').isInt({ min: 0 }),
], driverController.completeRide);

// GPS
router.post('/:driverId/location', [
  param('driverId').notEmpty(),
  body('lat').isFloat({ min: -90, max: 90 }),
  body('lng').isFloat({ min: -180, max: 180 }),
], driverController.updateLocation);

router.get('/:driverId/location-history', [
  param('driverId').notEmpty(),
], driverController.getLocationHistory);

// Earnings & History
router.get('/:driverId/earnings', [
  param('driverId').notEmpty(),
], driverController.getDriverEarnings);

router.get('/:driverId/ride-history', [
  param('driverId').notEmpty(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], driverController.getRideHistory);

router.get('/:driverId/current-ride', [
  param('driverId').notEmpty(),
], driverController.getCurrentRide);

module.exports = router;