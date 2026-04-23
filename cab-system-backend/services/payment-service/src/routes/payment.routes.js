//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\routes\payment.routes.js
// src/routes/payment.routes.js
const express = require("express");
const router = express.Router();
const controller = require("../controllers/payment.controller");

// Tạo URL thanh toán VNPay
router.post("/vnpay/create", controller.createVNPay);

// VNPay callback sau khi user thanh toán
router.get("/vnpay-return", controller.vnpayReturn);

// Frontend polling trạng thái
router.get("/status/:rideId", controller.getStatus);

module.exports = router;