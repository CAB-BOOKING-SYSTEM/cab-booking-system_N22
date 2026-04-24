// routes/driverRoutes.js
const express = require('express');
const { body, param, query } = require('express-validator');
const driverController = require('../controllers/driverController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ========== PUBLIC ROUTES ==========
router.get('/online/list', [
  query('lat').optional().isFloat(),
  query('lng').optional().isFloat(),
], driverController.getOnlineDrivers);

router.get('/:driverId', driverController.getDriverInfo);

// 🔥 THÊM INTERNAL ROUTE NÀY (cho Auth Service gọi)
router.post('/internal/create', [
  body('driverId').notEmpty(),
  body('email').isEmail(),
  body('fullName').notEmpty(),
  body('phone').optional(),
  body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']),
  body('licensePlate').optional(),
], driverController.internalCreateDriver);

// ========== PROTECTED ROUTES ==========
router.put('/profile', 
  authMiddleware,
  [
    body('fullName').optional().isString(),
    body('vehicleType').optional().isIn(['4_seat', '7_seat', 'luxury']),
  ], 
  driverController.updateProfile
);

router.post('/toggle-status',
  authMiddleware,
  [
    body('status').isIn(['online', 'offline']),
  ],
  driverController.toggleStatus
);

router.get('/location-history',
  authMiddleware,
  driverController.getLocationHistory
);

router.post('/accept-ride',
  authMiddleware,
  [
    body('rideId').notEmpty(),
  ],
  driverController.acceptRide
);

router.post('/reject-ride',
  authMiddleware,
  [
    body('rideId').notEmpty(),
  ],
  driverController.rejectRide
);

router.post('/start-ride',
  authMiddleware,
  [
    body('rideId').notEmpty(),
  ],
  driverController.startRide
);

router.post('/complete-ride',
  authMiddleware,
  [
    body('rideId').notEmpty(),
    body('distance').isFloat({ min: 0 }),
    body('duration').isInt({ min: 0 }),
  ],
  driverController.completeRide
);

router.get('/earnings',
  authMiddleware,
  driverController.getDriverEarnings
);

router.get('/ride-history',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  driverController.getRideHistory
);

router.get('/current-ride',
  authMiddleware,
  driverController.getCurrentRide
);

router.get('/wallet',
  authMiddleware,
  driverController.getWallet
);

router.post('/wallet/withdraw',
  authMiddleware,
  [
    body('amount').isFloat({ min: 10000 }),
    body('bankAccount').optional(),
  ],
  driverController.requestWithdraw
);

router.get('/wallet/transactions',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  driverController.getTransactionHistory
);

module.exports = router;