const express = require('express');
const router = express.Router();
const historicalController = require('../controllers/historicalController');

// GET historical data with date range
router.get('/', historicalController.getHistory);

module.exports = router;