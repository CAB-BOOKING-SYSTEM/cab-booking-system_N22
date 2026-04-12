 
const express = require('express');
const { body, param } = require('express-validator');
const matchingController = require('../controllers/matchingController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Find driver for a ride
router.post(
  '/find-driver',
  [
    body('rideId').notEmpty().withMessage('Ride ID is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']),
  ],
  matchingController.findDriver
);

// Get match result by ride ID
router.get(
  '/result/:rideId',
  [param('rideId').notEmpty().withMessage('Ride ID is required')],
  matchingController.getMatchResult
);

// Health check
router.get('/health', matchingController.healthCheck);

module.exports = router;