const charge = async (ride) => {
  console.log("💳 Stripe charge:", ride.id);

  return {
    success: true,
    transactionId: "stripe_" + Date.now(),
  };
};

module.exports = { charge };