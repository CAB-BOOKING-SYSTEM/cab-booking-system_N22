const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');

router.get('/', pricingController.getAllPricing);
router.get('/:vehicleType', pricingController.getPricingByVehicle);
router.post('/', pricingController.createPricing);
router.put('/:vehicleType', pricingController.updatePricing);
router.delete('/:vehicleType', pricingController.deletePricing);

module.exports = router;