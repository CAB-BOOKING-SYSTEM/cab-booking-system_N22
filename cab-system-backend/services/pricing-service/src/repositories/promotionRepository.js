const Promotion = require('../models/promotionModel');

const getPromotionByCode = async (code) => {
  console.log(`🔍 Querying promotion for code: ${code}`);
  return await Promotion.findByCode(code);
};

const getAllPromotions = async () => {
  console.log(`🔍 Querying all promotions`);
  return await Promotion.findAll();
};

const createPromotion = async (data) => {
  const promotion = await Promotion.create(data);
  console.log(`✅ Created promotion: ${data.code}`);
  return promotion;
};

const updatePromotion = async (code, updateData) => {
  const promotion = await Promotion.update(code, updateData);
  if (promotion) {
    console.log(`✅ Updated promotion: ${code}`);
  }
  return promotion;
};

const deletePromotion = async (code) => {
  const promotion = await Promotion.delete(code);
  if (promotion) {
    console.log(`✅ Deleted promotion: ${code}`);
  }
  return promotion;
};

const incrementUsageCount = async (code) => {
  const promotion = await Promotion.incrementUsageCount(code);
  if (promotion) {
    console.log(`✅ Incremented usage count for: ${code}`);
  }
  return promotion;
};

module.exports = {
  getPromotionByCode,
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  incrementUsageCount
};