const express = require("express");
const controller = require("../controllers/payment.controller");
const auth = require("../middlewares/auth");

const router = express.Router();

router.post("/vnpay/create", auth, controller.createVNPay);
router.get("/vnpay-return", controller.vnpayReturn);
router.get("/:bookingId", auth, controller.getPayment);

module.exports = router;