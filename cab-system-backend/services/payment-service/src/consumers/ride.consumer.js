const { getChannel } = require("../config/rabbitMQ");
const { processPayment } = require("../services/payment.service");

const startConsumer = async () => {
  const ch = getChannel();

  // 🔥 FIX: dùng ride.completed
  const queue = "ride.completed";
  const exchange = "ride.events";
  const routingKey = "ride.completed";

  await ch.assertExchange(exchange, "topic", { durable: true });
  await ch.assertQueue(queue, { durable: true });
  await ch.bindQueue(queue, exchange, routingKey);

  console.log(`👂 Listening queue: ${queue}`);

  ch.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const ride = JSON.parse(msg.content.toString());

      console.log("🚗 Ride completed received:", ride);

      await processPayment(ride);

      ch.ack(msg);
    } catch (err) {
      console.error("❌ Payment error:", err.message);
      ch.nack(msg, false, false);
    }
  });
};

module.exports = { startConsumer };