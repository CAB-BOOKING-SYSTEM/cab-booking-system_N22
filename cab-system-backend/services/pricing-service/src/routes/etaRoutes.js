const express = require('express');
const router = express.Router();
const { getETA } = require('../services/etaService');

router.post('/', async (req, res) => {
  try {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng } = req.body;
    
    if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: pickupLat, pickupLng, dropoffLat, dropoffLng'
      });
    }
    
    const eta = await getETA(pickupLat, pickupLng, dropoffLat, dropoffLng);
    
    res.json({
      success: true,
      data: eta,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;