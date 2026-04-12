// mock-services/mock-pricing.js
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Price calculation logic
function calculatePrice(distance, duration, vehicleType) {
  const basePrices = {
    'car_4': 20000,
    'car_7': 25000,
    'motorbike': 10000
  };
  
  const perKmPrices = {
    'car_4': 10000,
    'car_7': 12000,
    'motorbike': 5000
  };
  
  const basePrice = basePrices[vehicleType] || 20000;
  const perKmPrice = perKmPrices[vehicleType] || 10000;
  
  const distancePrice = (distance || 0) * perKmPrice;
  const timePrice = (duration || 0) * 1000;
  const total = basePrice + distancePrice + timePrice;
  
  // Simulate surge pricing based on time of day
  const hour = new Date().getHours();
  let surgeMultiplier = 1.0;
  if (hour >= 7 && hour <= 9) surgeMultiplier = 1.3; // Morning rush
  if (hour >= 17 && hour <= 19) surgeMultiplier = 1.5; // Evening rush
  if (hour >= 22 || hour <= 5) surgeMultiplier = 1.2; // Late night
  
  return {
    basePrice,
    distancePrice,
    timePrice,
    surgeMultiplier,
    total: Math.round(total * surgeMultiplier),
    currency: 'VND'
  };
}

// API endpoints
app.post('/api/v1/pricing/estimate', (req, res) => {
  const { distance, duration, vehicleType, pickupLocation, dropoffLocation } = req.body;
  
  console.log(`📊 Pricing request: ${vehicleType}, ${distance}km, ${duration}min`);
  
  // Simulate network delay
  setTimeout(() => {
    const price = calculatePrice(distance, duration, vehicleType);
    
    // Add zone info if provided
    if (pickupLocation) {
      console.log(`📍 Pickup zone: ${pickupLocation.address?.substring(0, 50)}...`);
    }
    
    res.json(price);
  }, 100);
});

app.get('/api/v1/pricing/health', (req, res) => {
  res.json({ status: 'ok', service: 'mock-pricing-service' });
});

const PORT = process.env.PRICING_PORT || 3004;
app.listen(PORT, () => {
  console.log(`🎯 Mock Pricing Service running on port ${PORT}`);
  console.log(`📊 API: http://localhost:${PORT}/api/v1/pricing/estimate`);
  console.log(`💡 Surge multipliers: Morning(1.3), Evening(1.5), Late night(1.2)`);
});