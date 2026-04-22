const paymentService = require("../services/payment.service");
const { createPaymentUrl } = require("../services/vnpay.service");

class PaymentController {

  // tạo link VNPay
  async createVNPay(req, res) {
    const { rideId, amount } = req.query;

    const url = createPaymentUrl({
      ride_id: rideId,
      amount: Number(amount)
    });

    return res.json({ url });
  }

  // 🔥 RETURN = xử lý chính luôn
  async vnpayReturn(req, res) {
    try {
      const result = await paymentService.handleVNPayReturn(req.query);

      return res.json({
        success: result.success,
        rideId: req.query.vnp_TxnRef
      });

    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message });
    }
  }

  
}

module.exports = new PaymentController();