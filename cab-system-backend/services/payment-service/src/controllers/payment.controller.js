//D:\bc_cki_new3\cab-booking-system_N22\cab-system-backend\services\payment-service\src\controllers\payment.controller.js
const vnpay          = require("../services/vnpay.service");
const paymentService = require("../services/payment.service");
const repo           = require("../repositories/payment.repo");
const walletRepo     = require("../repositories/driverWallet.repo");

class PaymentController {
  async createVNPay(req, res) {
    try {
      const { bookingId } = req.body;
      if (!bookingId)
        return res.status(400).json({ message: "bookingId required" });

      const payment = await repo.findByBookingId(bookingId);
      if (!payment)
        return res.status(404).json({ success: false, message: "Payment not found" });

      if (payment.status !== "PENDING")
        return res.status(400).json({ success: false, message: `Payment already ${payment.status}` });

      if (!payment.driver_id)
        return res.status(400).json({ success: false, message: "Ride not completed yet" });

      const url = vnpay.createPaymentUrl({
        booking_id:    bookingId,
        amount:        payment.amount,
        paymentMethod: payment.payment_method,
      });

      res.json({ success: true, paymentUrl: url });
    } catch (err) {
      console.error("createVNPay error:", err);
      res.status(500).json({ message: "Internal error" });
    }
  }

  async vnpayReturn(req, res) {
    try {
      const result = await paymentService.handleVNPayReturn(req.query);
      if (result.success) return res.send("✅ Thanh toán thành công");
      return res.send("❌ Thanh toán thất bại");
    } catch (err) {
      console.error("vnpayReturn error:", err);
      res.status(500).send("Lỗi xử lý");
    }
  }

  async getPayment(req, res) {
    try {
      const payment = await repo.findByBookingId(req.params.bookingId);
      if (!payment)
        return res.status(404).json({ message: "Not found" });
      res.json(payment);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  }

  async getDriverWallet(req, res) {
    try {
      const { driverId } = req.params;
      const wallet = await walletRepo.getBalance(driverId);
      if (!wallet)
        return res.json({ driver_id: driverId, balance: 0 });
      res.json(wallet);
    } catch (err) {
      res.status(500).json({ message: "Internal error" });
    }
  }
}

module.exports = new PaymentController();