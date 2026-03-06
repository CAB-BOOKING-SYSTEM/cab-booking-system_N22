/**
 * Route test — CHỈ DÙNG TRONG DEV
 * POST /api/payments/test
 * Body: { rideId, userId, amount, paymentMethod }
 * 
 * Tự tạo payment record + thực hiện charge luôn
 * không cần đợi event từ RabbitMQ
 */

const express = require("express");
const router = express.Router();

const PaymentService = require("../services/paymentsService");

router.post("/", async (req, res) => {
  // Chặn dùng trong production
  if (process.env.NODE_ENV === "production") {
    return res.status(403).json({ error: "Not allowed in production" });
  }

  const { rideId, userId, amount, paymentMethod } = req.body;

  if (!rideId || !amount || !paymentMethod) {
    return res.status(400).json({
      error: "Missing fields",
      required: ["rideId", "userId", "amount", "paymentMethod"]
    });
  }

  try {
    const service = new PaymentService();

    // Gọi thẳng _chargeWithRetry như khi nhận event thật
    const paymentsRepository = require("../repositories/paymentsRepository");

    const payment = await paymentsRepository.create({
      ride_id: rideId,
      user_id: userId || 0,
      amount,
      provider: paymentMethod,
    });

    console.log(`[TEST] Created payment #${payment.id}, starting charge...`);

    // Không await để response về ngay, charge chạy background
    service._chargeWithRetry(payment, paymentMethod).catch(console.error);

    res.json({
      message: "Payment triggered",
      paymentId: payment.id,
      hint: "Xem log terminal để theo dõi kết quả"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;