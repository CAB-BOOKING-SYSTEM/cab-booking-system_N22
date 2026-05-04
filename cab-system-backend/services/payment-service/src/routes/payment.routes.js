//D:\bc_cki_new1\cab-booking-system_N22\cab-system-backend\services\payment-service\src\routes\payment.routes.js
const express    = require("express");
const controller = require("../controllers/payment.controller");
const auth       = require("../middlewares/auth");

const router = express.Router();

router.post("/vnpay/create",           auth, controller.createVNPay);
router.get("/vnpay-return",                  controller.vnpayReturn);
router.get("/driver-wallet/:driverId", auth, controller.getDriverWallet);
router.get("/:bookingId",              auth, controller.getPayment);

module.exports = router;