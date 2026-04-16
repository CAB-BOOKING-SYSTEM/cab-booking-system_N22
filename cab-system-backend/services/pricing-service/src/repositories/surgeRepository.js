const Surge = require('../models/surgeModel');

const getSurge = async (zone) => {
  console.log(`🔍 Querying surge for zone: ${zone}`);
  return await Surge.getMultiplier(zone);
};

const getAllSurgeZones = async () => {
  console.log(`🔍 Querying all surge zones`);
  return await Surge.findAll();
};

const createSurge = async (zone, multiplier) => {
  const surge = await Surge.create(zone, multiplier);
  console.log(`✅ Created/Updated surge for zone: ${zone}`);
  return surge;
};

const updateSurge = async (zone, multiplier) => {
  const surge = await Surge.update(zone, multiplier);
  if (surge) {
    console.log(`✅ Updated surge for zone: ${zone}`);
  }
  return surge;
};

const deleteSurge = async (zone) => {
  const surge = await Surge.delete(zone);
  if (surge) {
    console.log(`✅ Deleted surge for zone: ${zone}`);
  }
  return surge;
};

module.exports = {
  getSurge,
  getAllSurgeZones,
  createSurge,
  updateSurge,
  deleteSurge
};