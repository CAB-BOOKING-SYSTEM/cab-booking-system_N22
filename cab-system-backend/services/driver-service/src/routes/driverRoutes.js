const express = require('express');
const { body, param, query } = require('express-validator');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ✅ Public route (login)
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], driverController.login);

// ✅ Protected routes
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

// Nearby drivers
router.get('/online/list', [
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
], driverController.getOnlineDrivers);

module.exports = router;