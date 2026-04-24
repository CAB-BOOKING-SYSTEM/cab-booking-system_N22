const vnpay = require("../services/vnpay.service");
const paymentService = require("../services/payment.service");
const repo = require("../repositories/payment.repo");

class PaymentController {
  async createVNPay(req, res) {
    try {
      const { bookingId } = req.body;

      const payment = await repo.findByBookingId(bookingId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }

      const url = vnpay.createPaymentUrl({
        ride_id: bookingId,
        amount: payment.amount,
      });

      res.json({ success: true, paymentUrl: url });
    } catch (err) {
      res.status(500).json({ message: "Error" });
    }
  }

  async vnpayReturn(req, res) {
    const result = await paymentService.handleVNPayReturn(req.query);

    if (result.success) return res.send("✅ SUCCESS");
    return res.send("❌ FAILED");
  }

  async getPayment(req, res) {
    const payment = await repo.findByBookingId(req.params.bookingId);
    res.json(payment);
  }
}

module.exports = new PaymentController();