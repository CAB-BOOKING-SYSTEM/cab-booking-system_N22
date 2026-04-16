const promotionRepository = require('../repositories/promotionRepository');

const validatePromotion = async (code, tripValue, vehicleType, zone) => {
  const promotion = await promotionRepository.getPromotionByCode(code);
  
  if (!promotion) {
    throw new Error('Invalid or expired promotion code');
  }
  
  // Kiểm tra usage limit
  if (promotion.usage_limit && promotion.used_count >= promotion.usage_limit) {
    throw new Error('Promotion code has reached usage limit');
  }
  
  // Kiểm tra min trip value
  if (tripValue < promotion.min_trip_value) {
    throw new Error(`Minimum trip value for this promotion is ${promotion.min_trip_value}`);
  }
  
  // Kiểm tra vehicle type
  if (promotion.applicable_vehicle_types && 
      promotion.applicable_vehicle_types.length > 0 && 
      !promotion.applicable_vehicle_types.includes(vehicleType)) {
    throw new Error('Promotion not applicable for this vehicle type');
  }
  
  // Kiểm tra zone
  if (promotion.applicable_zones && 
      promotion.applicable_zones.length > 0 && 
      !promotion.applicable_zones.includes(zone)) {
    throw new Error('Promotion not applicable for this zone');
  }
  
  return promotion;
};

const calculateDiscount = (tripValue, promotion) => {
  let discount = 0;
  
  if (promotion.type === 'fixed') {
    discount = promotion.value;
  } else if (promotion.type === 'percentage') {
    discount = (tripValue * promotion.value) / 100;
  }
  
  // Giới hạn discount tối đa nếu có
  if (promotion.max_discount && discount > promotion.max_discount) {
    discount = promotion.max_discount;
  }
  
  return discount;
};

const applyPromotion = async (code, tripValue, vehicleType, zone) => {
  // Validate promotion
  const promotion = await validatePromotion(code, tripValue, vehicleType, zone);
  
  // Calculate discount
  const discount = calculateDiscount(tripValue, promotion);
  
  // Increment usage count
  await promotionRepository.incrementUsageCount(code);
  
  return {
    code: promotion.code,
    originalPrice: tripValue,
    discount,
    finalPrice: tripValue - discount,
    promotionType: promotion.type,
    promotionValue: promotion.value
  };
};

module.exports = {
  validatePromotion,
  calculateDiscount,
  applyPromotion
};