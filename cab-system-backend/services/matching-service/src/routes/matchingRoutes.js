const express = require('express');
const { body, param, query } = require('express-validator');
const matchingController = require('../controllers/matchingController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/health', matchingController.healthCheck);

// router.use(authMiddleware);

router.post(
  '/find-driver',
  [
    body('rideId').notEmpty().withMessage('Ride ID is required'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('pickupLat').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
    body('pickupLng').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
    body('dropoffLat').optional().isFloat({ min: -90, max: 90 }),
    body('dropoffLng').optional().isFloat({ min: -180, max: 180 }),
    body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']).withMessage('Invalid vehicle type'),
  ],
  matchingController.findDriver
);

router.get(
  '/result/:rideId',
  [
    param('rideId').notEmpty().withMessage('Ride ID is required'),
  ],
  matchingController.getMatchResult
);

router.get(
  '/stats',
  matchingController.getMatchingStats
);

module.exports = router;