const express = require("express");
const router = express.Router();

const controller = require("../controllers/payment.controller");

router.post("/vnpay/create", controller.createVNPay);
router.get("/vnpay-return", controller.vnpayReturn);

module.exports = router;