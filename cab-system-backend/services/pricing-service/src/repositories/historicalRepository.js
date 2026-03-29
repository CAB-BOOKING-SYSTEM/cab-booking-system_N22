const Historical = require('../models/historicalModel');

const saveHistory = async (data) => {
  console.log(`💾 Saving historical record: ${data.requestId}`);
  return await Historical.save(data);
};

const getHistoryByDate = async (startDate, endDate) => {
  console.log(`🔍 Querying history from ${startDate} to ${endDate}`);
  return await Historical.getHistoryByDate(startDate, endDate);
};

const getHistoryByZone = async (zone) => {
  console.log(`🔍 Querying history for zone: ${zone}`);
  return await Historical.getHistoryByZone(zone);
};

const getHistoryByUser = async (userId) => {
  console.log(`🔍 Querying history for user: ${userId}`);
  return await Historical.getHistoryByUser(userId);
};

module.exports = {
  saveHistory,
  getHistoryByDate,
  getHistoryByZone,
  getHistoryByUser
};