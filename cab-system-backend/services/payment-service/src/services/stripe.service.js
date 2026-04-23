//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\services\stripe.service.js
const charge = async (ride) => {
  console.log("💳 Stripe charge:", ride.id);

  return {
    success: true,
    transactionId: "stripe_" + Date.now(),
  };
};

module.exports = { charge };