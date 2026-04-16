const estimateService = require('../services/estimateService');
const { successResponse, errorResponse } = require('../utils/responseUtil');

// Hàm xác định zone từ tọa độ
function determineZone(lat, lng) {
  // Khu vực trung tâm
  if (lat >= 10.75 && lat <= 10.8 && lng >= 106.65 && lng <= 106.72) {
    return 'CENTER';
  }
  // Khu vực sân bay
  if (lat >= 10.8 && lat <= 10.85 && lng >= 106.7 && lng <= 106.75) {
    return 'AIRPORT';
  }
  // Mặc định ngoại ô
  return 'SUBURB';
}

// Hàm map vehicleType từ Booking sang Pricing
function mapVehicleType(vehicleType) {
  const mapping = {
    'car_4': 'car',
    'car_7': 'suv',
    'bike': 'bike',
    'car': 'car',
    'suv': 'suv'
  };
  return mapping[vehicleType] || 'car';
}

const estimateFare = async (req, res) => {
  try {
    const { pickupLocation, dropoffLocation, vehicleType, distance, duration, paymentMethod, zone } = req.body;
    
    // Map vehicleType (car_4 -> car, car_7 -> suv)
    const mappedVehicleType = mapVehicleType(vehicleType);
    
    // Xác định zone (nếu Booking gửi thì dùng, không thì tự tính)
    const finalZone = zone || determineZone(pickupLocation.lat, pickupLocation.lng);
    
    const result = await estimateService.calculateEstimate({
      pickupLat: pickupLocation.lat,
      pickupLng: pickupLocation.lng,
      dropoffLat: dropoffLocation.lat,
      dropoffLng: dropoffLocation.lng,
      vehicleType: mappedVehicleType,
      distance: parseFloat(distance),
      duration: parseInt(duration),
      zone: finalZone,
      paymentMethod: paymentMethod,
      userId: req.body.userId
    });
    
    return successResponse(res, result);
  } catch (error) {
    console.error('Error in estimateFare:', error);
    return errorResponse(res, error.message);
  }
};

module.exports = { estimateFare };