// src/utils/messageBroker.js
const amqp = require("amqplib");

let channel = null;
let connection = null;

const connect = async (retries = 5) => {
  while (retries > 0) {
    try {
      connection = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await connection.createChannel();

      connection.on("error", (err) => {
        console.error("[MQ] Connection error:", err.message);
        channel = null; connection = null;
      });
      connection.on("close", () => {
        console.warn("[MQ] Connection closed — will reconnect on next call");
        channel = null; connection = null;
      });

      console.log("🐰 RabbitMQ connected");
      return;
    } catch (err) {
      console.log(`⏳ Waiting for RabbitMQ... (${retries} retries left)`);
      retries--;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  throw new Error("❌ Cannot connect to RabbitMQ after retries");
};

// ─── PUBLISH ─────────────────────────────────────────────────────────────────
// 🔥 FIX: assertQueue + bindQueue để message không bị drop khi consumer chưa online
const publish = async (exchange, routingKey, message) => {
  if (!channel) await connect();

  try {
    // 1. Đảm bảo exchange tồn tại
    await channel.assertExchange(exchange, "topic", { durable: true });

    // 2. Đảm bảo queue tồn tại và được bind — tránh message bị drop
    const queueName = routingKey; // convention: queue name = routing key
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchange, routingKey);

    // 3. Publish
    const ok = channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    if (!ok) {
      console.warn(`[MQ] ⚠️ publish returned false (backpressure): ${exchange} → ${routingKey}`);
    } else {
      console.log(`[MQ] 📤 Published: [${exchange}] → ${routingKey}`);
    }
  } catch (err) {
    console.error(`[MQ] ❌ Publish failed (${exchange} → ${routingKey}):`, err.message);
    // Reset channel để lần sau tự reconnect
    channel = null;
    throw err; // re-throw để caller biết publish thất bại
  }
};

// ─── CONSUME ─────────────────────────────────────────────────────────────────
const consume = async (queue, exchange, routingKey, handler) => {
  if (!channel) await connect();

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);

  console.log(`[MQ] 👂 Listening on queue: ${queue} (${exchange} → ${routingKey})`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;
    try {
      const event = JSON.parse(msg.content.toString());
      console.log(`[MQ] 📥 Received [${queue}]:`, JSON.stringify(event));
      await handler(event);
      channel.ack(msg);
    } catch (err) {
      console.error(`[MQ] ❌ Handler error on queue ${queue}:`, err.message);
      channel.nack(msg, false, false); // dead-letter, không requeue
    }
  });
};

module.exports = { connect, publish, consume };