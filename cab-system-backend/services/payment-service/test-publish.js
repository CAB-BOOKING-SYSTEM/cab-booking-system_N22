/**
 * Script test: Publish event "ride.finished" lên RabbitMQ
 * Chạy: node test-publish.js
 * 
 * Đảm bảo docker-compose đang chạy trước khi chạy script này
 */

require("dotenv").config();
const amqp = require("amqplib");

// ✅ Sửa thành
const RABBITMQ_URL = "amqp://admin:password123@localhost:5672";

// ── Tuỳ chỉnh data test ở đây ──
const testEvent = {
  rideId: 1,
  userId: 42,
  amount: 50000,         // VND nếu dùng VNPay, USD nếu dùng Stripe
  paymentMethod: "stripe" // "stripe" | "vnpay"
};
// ───────────────────────────────

async function publish() {
  let connection;

  try {
    console.log("Connecting to RabbitMQ:", RABBITMQ_URL);
    connection = await amqp.connect(RABBITMQ_URL);

    const channel = await connection.createChannel();

    await channel.assertQueue("ride.finished", { durable: true });

    channel.sendToQueue(
      "ride.finished",
      Buffer.from(JSON.stringify(testEvent)),
      { persistent: true }
    );

    console.log("✅ Published event to ride.finished:");
    console.log(JSON.stringify(testEvent, null, 2));
    console.log("\n👉 Kiểm tra log của payment-service để xem kết quả");

  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    if (connection) {
      setTimeout(() => connection.close(), 500);
    }
  }
}

publish();