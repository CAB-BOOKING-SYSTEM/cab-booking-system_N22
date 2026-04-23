/**
 * payment.controller.js — Production-grade, ổn định
 *
 * Fix so với bản cũ:
 *  1. createVNPay: dùng ride_id (snake_case) nhất quán với DB & vnpay.service
 *  2. vnpayReturn: verifyReturn đã được export đúng từ vnpay.service
 *  3. getStatus: không require() inline trong handler (tệ về performance & style)
 *  4. Tất cả redirect dùng FRONTEND_URL từ env, không hardcode localhost
 */

const paymentService = require("../services/payment.service");
const paymentRepo    = require("../repositories/payment.repo");
const { createPaymentUrl, verifyReturn } = require("../services/vnpay.service");

class PaymentController {

  // ── CREATE PAYMENT URL ────────────────────────────────────────────────────
  async createVNPay(req, res) {
    try {
      // ✅ Chấp nhận cả Body (JSON) lẫn Query String
      const { rideId, amount } = { ...req.query, ...req.body };

      if (!rideId || !amount) {
        return res.status(400).json({ error: "Thiếu rideId hoặc amount" });
      }

      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({ error: "amount không hợp lệ" });
      }

      // Kiểm tra payment đã tồn tại chưa (tránh tạo URL cho ride đã thanh toán)
      const existing = await paymentRepo.findByRideId(rideId);
      if (existing && existing.status === "SUCCESS") {
        return res.status(409).json({ error: "Ride này đã thanh toán thành công" });
      }

      const url = createPaymentUrl({
        ride_id: rideId,   // ✅ nhất quán với DB (snake_case)
        amount:  amountNum,
      });

      return res.json({ url });

    } catch (err) {
      console.error("createVNPay error:", err);
      return res.status(500).json({ error: err.message });
    }
  }

  // ── VNPAY RETURN CALLBACK ─────────────────────────────────────────────────
  async vnpayReturn(req, res) {
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";

    try {
      // 1. Xác minh chữ ký — nếu sai, dừng ngay
      const isValid = verifyReturn(req.query);
      if (!isValid) {
        console.error("❌ Invalid VNPay signature — query:", req.query);
        return res.redirect(
          `${frontendBase}/payment/result?status=error&message=invalid_signature`
        );
      }

      // 2. Xử lý business logic
      const result = await paymentService.handleVNPayReturn(req.query);
      const rideId = req.query.vnp_TxnRef;

      if (result.success) {
        return res.redirect(
          `${frontendBase}/payment/result?status=success&rideId=${encodeURIComponent(rideId)}`
        );
      }

      return res.redirect(
        `${frontendBase}/payment/result?status=failed&rideId=${encodeURIComponent(rideId)}&code=${encodeURIComponent(result.errorCode)}`
      );

    } catch (err) {
      console.error("vnpayReturn error:", err);
      const frontendFallback = process.env.FRONTEND_URL || "http://localhost:3000";
      return res.redirect(
        `${frontendFallback}/payment/result?status=error&message=${encodeURIComponent(err.message)}`
      );
    }
  }

  // ── CHECK STATUS (frontend polling) ──────────────────────────────────────
  async getStatus(req, res) {
    try {
      const { rideId } = req.params;

      if (!rideId) {
        return res.status(400).json({ error: "Thiếu rideId" });
      }

      const payment = await paymentRepo.findByRideId(rideId);
      if (!payment) {
        return res.status(404).json({ message: "Không tìm thấy payment" });
      }

      return res.json({
        rideId,
        paymentId: payment.id,
        status:    payment.status,   // PENDING | SUCCESS | FAILED
        amount:    payment.amount,
      });

    } catch (err) {
      console.error("getStatus error:", err);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new PaymentController();