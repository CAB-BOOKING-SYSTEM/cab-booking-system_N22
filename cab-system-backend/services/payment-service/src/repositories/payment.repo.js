const Payment = require("../models/payment.model");

module.exports = {
  create: Payment.create,
  findByRideId: Payment.findByRideId,
  update: Payment.update,
  increaseRetry: Payment.increaseRetry
};