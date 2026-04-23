//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\repositories\payment.repo.js
const Payment = require("../models/payment.model");

module.exports = {
  create: Payment.create,
  findByRideId: Payment.findByRideId,
  update: Payment.update,
  increaseRetry: Payment.increaseRetry
};