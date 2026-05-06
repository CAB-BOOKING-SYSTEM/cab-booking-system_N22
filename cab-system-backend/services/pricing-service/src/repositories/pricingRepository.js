const Pricing = require('../models/pricingModel');
const Surge = require('../models/surgeModel');

const getPricing = async (vehicleType) => {
  console.log(`🔍 Querying pricing for: ${vehicleType}`);
  return await Pricing.findByVehicleType(vehicleType);
};

const getAllPricing = async () => {
  console.log(`🔍 Querying all pricings`);
  return await Pricing.findAll();
};

const createPricing = async (data) => {
  const pricing = await Pricing.create(data);
  console.log(`✅ Created pricing for: ${data.vehicleType}`);
  return pricing;
};

const updatePricing = async (vehicleType, updateData) => {
  const pricing = await Pricing.update(vehicleType, updateData);
  if (pricing) {
    console.log(`✅ Updated pricing for: ${vehicleType}`);
  }
  return pricing;
};

const deletePricing = async (vehicleType) => {
  const pricing = await Pricing.delete(vehicleType);
  if (pricing) {
    console.log(`✅ Deleted pricing for: ${vehicleType}`);
  }
  return pricing;
};

const getSurge = async (zone) => {
  console.log(`🔍 Querying surge for zone: ${zone}`);
  return await Surge.getMultiplier(zone);
};

module.exports = { 
  getPricing,
  getAllPricing,
  createPricing,
  updatePricing,
  deletePricing,
  getSurge
};