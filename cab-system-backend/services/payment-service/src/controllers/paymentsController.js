const PaymentService = require("../services/paymentsService");

const service = new PaymentService();

class PaymentController {
  // GET /api/payments/:rideId
  async getPayment(req, res) {
    try {
      const payment = await service.getPayment(req.params.rideId);
      res.json(payment);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  }

  // POST /api/payments/url
  // Body: { ride_id, method: "stripe" | "vnpay" }
  async createUrl(req, res) {
    try {
      const { ride_id, method } = req.body;

      if (!ride_id || !method) {
        return res.status(400).json({ error: "ride_id and method are required" });
      }

      const url = await service.getPaymentUrl(ride_id, method);
      res.json({ payment_url: url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // GET /api/payments/vnpay-return  (VNPay redirect về đây)
  async vnpayReturn(req, res) {
    try {
      const result = await service.handleVNPayReturn(req.query);
      if (result.success) {
        res.send("Payment success. You can close this tab.");
      } else {
        res.send("Payment failed. Please try again.");
      }
    } catch (error) {
      res.status(400).send(`Error: ${error.message}`);
    }
  }

  // GET /api/payments/success  (Stripe redirect về đây)
  async stripeSuccess(req, res) {
    const { ride_id } = req.query;
    res.send(`Payment successful for ride ${ride_id}. You can close this tab.`);
  }

  // GET /api/payments/cancel
  async stripeCancel(req, res) {
    const { ride_id } = req.query;
    res.send(`Payment cancelled for ride ${ride_id}.`);
  }
}

module.exports = PaymentController;