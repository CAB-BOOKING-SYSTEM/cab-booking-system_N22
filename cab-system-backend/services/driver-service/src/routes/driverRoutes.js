const express = require('express');
const { body, param, query } = require('express-validator');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', [
  body('phone').isMobilePhone(),
  body('fullName').notEmpty(),
  body('licensePlate').notEmpty(),
  body('vehicleType').isIn(['4_seat', '7_seat', 'luxury']),
  body('email').optional().isEmail(),
], driverController.register);

router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], driverController.login);

// Public route for matching service
router.get('/online/list', [
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
], driverController.getOnlineDrivers);

// ⚠️ ĐÃ XÓA HTTP LOCATION API - Mobile App phải dùng WebSocket
// router.post('/:driverId/location', ...) - ĐÃ XÓA

// Profile routes
router.put('/:driverId/profile', [
  param('driverId').notEmpty(),
  body('fullName').optional().isString(),
  body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']),
], driverController.updateProfile);

router.get('/:driverId', driverController.getDriverInfo);

// Status routes
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

// Location history (read-only)
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
// ==================== WALLET MANAGEMENT ====================

// Xem ví
router.get('/:driverId/wallet', driverController.getWallet);

// Yêu cầu rút tiền
router.post('/:driverId/wallet/withdraw', [
  param('driverId').notEmpty(),
  body('amount').isFloat({ min: 10000 }).withMessage('Số tiền tối thiểu 10,000đ'),
  body('bankAccount').optional(),
], driverController.requestWithdraw);

// Lịch sử giao dịch
router.get('/:driverId/wallet/transactions', [
  param('driverId').notEmpty(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], driverController.getTransactionHistory);
// ==================== WALLET MANAGEMENT ====================
router.get('/:driverId/wallet', driverController.getWallet);
router.post('/:driverId/wallet/withdraw', driverController.requestWithdraw);
router.get('/:driverId/wallet/transactions', driverController.getTransactionHistory);
module.exports = router;