const messageBroker = require("../utils/messageBroker");

async function createQueues() {
  try {
    const ch = await messageBroker.getChannel();

    await ch.assertExchange("payment.events", "topic", { durable: true });

    // ✅ queue trùng tên event
    await ch.assertQueue("payment.completed", { durable: true });
    await ch.bindQueue(
      "payment.completed",
      "payment.events",
      "payment.completed"
    );

    await ch.assertQueue("payment.failed", { durable: true });
    await ch.bindQueue(
      "payment.failed",
      "payment.events",
      "payment.failed"
    );

    console.log("✅ Payment queues created");
  } catch (err) {
    console.error("❌ Queue error:", err.message);
  }
}

module.exports = { createQueues };