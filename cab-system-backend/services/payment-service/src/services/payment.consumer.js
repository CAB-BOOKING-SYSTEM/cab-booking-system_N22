//D:\bc_cki_new3\cab-booking-system_N22\cab-system-backend\services\payment-service\src\services\payment.consumer.js
const messageBroker = require("../utils/messageBroker");

async function createQueues() {
  try {
    const ch = await messageBroker.getChannel();

    await ch.assertExchange("payment.events", "topic", { durable: true });

    const queues = [
      { name: "payment.created",   key: "payment.created"   },
      { name: "payment.completed", key: "payment.completed" },
      { name: "payment.failed",    key: "payment.failed"    },
      { name: "payment.compensate",key: "payment.compensate"},
    ];

    for (const q of queues) {
      await ch.assertQueue(q.name, { durable: true });
      await ch.bindQueue(q.name, "payment.events", q.key);
    }

    console.log("✅ Payment queues ready");
  } catch (err) {
    console.error("❌ Queue setup error:", err.message);
  }
}

module.exports = { createQueues };