const amqp = require("amqplib");

let channel = null;

const connect = async () => {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  console.log("🐰 RabbitMQ connected");
};

const publish = async (exchange, routingKey, message) => {
  if (!channel) await connect();

  try {
    await channel.assertExchange(exchange, "topic", { durable: true });

    // 🔥 CHỈ SỬA DÒNG NÀY (KHÔNG replace nữa)
    const queueName = routingKey;

    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchange, routingKey);

    channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`📤 Published: ${exchange} → ${routingKey} | Queue: ${queueName}`);
  } catch (err) {
    console.error("❌ Publish error:", err.message);
  }
};

// Consume giữ nguyên
const consume = async (queue, exchange, routingKey, handler) => {
  if (!channel) await connect();

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, routingKey);

  console.log(`👂 Listening on queue: ${queue} (exchange: ${exchange}, key: ${routingKey})`);

  channel.consume(queue, async (msg) => {
    if (!msg) return;

    try {
      const event = JSON.parse(msg.content.toString());
      console.log("📥 Received event on queue", queue, ":", event);

      await handler(event);
      channel.ack(msg);
    } catch (err) {
      console.error("❌ Error processing message:", err);
      channel.nack(msg, false, false);
    }
  });
};

module.exports = { connect, publish, consume };