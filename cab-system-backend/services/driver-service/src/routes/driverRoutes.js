const express = require('express');
const { body, query } = require('express-validator');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');
const verifyDriver = require('../middleware/verifyDriver');

const router = express.Router();

// ==================== PUBLIC ROUTES (Không cần token) ====================

// Register - Auth Service sẽ gọi internal API này
router.post('/register', [
  body('phone').isMobilePhone(),
  body('fullName').notEmpty(),
  body('licensePlate').notEmpty(),
  body('vehicleType').isIn(['4_seat', '7_seat', 'luxury']),
  body('email').optional().isEmail(),
  body('authUserId').optional().isInt(),
], driverController.register);

// Login (tạm thời để test, sau này dùng Auth Service)
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], driverController.login);

// Public route cho matching service lấy danh sách driver online
router.get('/online/list', [
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
  query('vehicleType').optional().isString(),
], driverController.getOnlineDrivers);

// ==================== PROTECTED ROUTES (Cần JWT token) ====================
router.use(authMiddleware);

// Profile routes
router.get('/:driverId/profile', verifyDriver, driverController.getDriverInfo);
router.put('/:driverId/profile', verifyDriver, [
  body('fullName').optional().isString(),
  body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']),
], driverController.updateProfile);

// Status routes
router.post('/:driverId/toggle-status', verifyDriver, [
  body('status').isIn(['online', 'offline']),
], driverController.toggleStatus);

// Ride management
router.post('/:driverId/accept-ride', verifyDriver, [
  body('rideId').notEmpty(),
], driverController.acceptRide);

// ✅ ĐÃ SỬA: Thêm dấu phẩy sau verifyDriver
router.post('/:driverId/start-ride', verifyDriver, [
  body('rideId').notEmpty(),
], driverController.startRide);

router.post('/:driverId/complete-ride', verifyDriver, [
  body('rideId').notEmpty(),
  body('distance').isFloat({ min: 0 }),
  body('duration').isInt({ min: 0 }),
], driverController.completeRide);

// Location history
router.get('/:driverId/location-history', verifyDriver, [
  query('startDate').optional().isString(),
  query('endDate').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 500 }),
], driverController.getLocationHistory);

// Earnings & History
router.get('/:driverId/earnings', verifyDriver, [
  query('startDate').optional().isString(),
  query('endDate').optional().isString(),
], driverController.getDriverEarnings);

router.get('/:driverId/ride-history', verifyDriver, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isString(),
], driverController.getRideHistory);

router.get('/:driverId/current-ride', verifyDriver, driverController.getCurrentRide);

// Wallet management
router.get('/:driverId/wallet', verifyDriver, driverController.getWallet);
router.post('/:driverId/wallet/withdraw', verifyDriver, [
  body('amount').isFloat({ min: 10000 }),
  body('bankAccount').optional(),
], driverController.requestWithdraw);
router.get('/:driverId/wallet/transactions', verifyDriver, [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], driverController.getTransactionHistory);

module.exports = router;