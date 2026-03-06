const stripe = require("../config/stripe");

class StripeProvider {
  // Dùng cho checkout session (redirect URL) — dành cho VNPay-style flow
  async createCheckoutSession(payment) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Ride Payment" },
            unit_amount: Math.round(payment.amount * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.BASE_URL}/api/payments/success?ride_id=${payment.ride_id}`,
      cancel_url: `${process.env.BASE_URL}/api/payments/cancel?ride_id=${payment.ride_id}`,
    });

    return { url: session.url, sessionId: session.id };
  }

  // Dùng cho server-to-server charge (event-driven flow từ ride.finished)
  async charge(amount, currency = "usd") {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      payment_method_types: ["card"],
      confirm: false, // trong thực tế cần payment_method từ client
    });

    return { id: paymentIntent.id, status: paymentIntent.status };
  }
}

module.exports = new StripeProvider();