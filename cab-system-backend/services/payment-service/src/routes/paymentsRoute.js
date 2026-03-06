const express = require("express");
const router = express.Router();
const PaymentController = require("../controllers/paymentsController");

const controller = new PaymentController();

router.post("/url", (req, res) => controller.createUrl(req, res));
router.get("/vnpay-return", (req, res) => controller.vnpayReturn(req, res));
router.get("/success", (req, res) => controller.stripeSuccess(req, res));
router.get("/cancel", (req, res) => controller.stripeCancel(req, res));
router.get("/:rideId", (req, res) => controller.getPayment(req, res));

module.exports = router;