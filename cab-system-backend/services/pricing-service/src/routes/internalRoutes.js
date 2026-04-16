const express = require('express');
const router = express.Router();
const internalController = require('../controllers/internalController');

// Internal APIs (gọi từ Driver Service và Booking Service)
router.post('/drivers/update', internalController.updateDriverCount);
router.post('/requests/update', internalController.updateRequestCount);
router.get('/surge/:zone', internalController.getCurrentSurge);

module.exports = router;