const amqp = require("amqplib");

let connection = null;
let channel = null;
let isConnecting = false;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

// ✅ CONNECT (retry liên tục)
const connect = async () => {
  if (channel || isConnecting) return;

  isConnecting = true;

  while (!channel) {
    try {
      console.log("⏳ Connecting RabbitMQ...");

      connection = await amqp.connect(process.env.RABBITMQ_URL);

      connection.on("close", () => {
        console.log("⚠️ RabbitMQ closed → reconnect...");
        channel = null;
        isConnecting = false;
        setTimeout(connect, 3000);
      });

      connection.on("error", (err) => {
        console.log("❌ RabbitMQ error:", err.message);
      });

      channel = await connection.createChannel();

      console.log("🐰 RabbitMQ connected");
    } catch (err) {
      console.log("❌ Connect fail → retry 3s...");
      await sleep(3000);
    }
  }

  isConnecting = false;
};

// ✅ GET CHANNEL
const getChannel = async () => {
  if (!channel) await connect();

  while (!channel) {
    await sleep(500);
  }

  return channel;
};

// ✅ PUBLISH
const publish = async (exchange, routingKey, message) => {
  try {
    const ch = await getChannel();

    await ch.assertExchange(exchange, "topic", { durable: true });

    ch.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    console.log(`📤 Published: ${routingKey}`, message);
  } catch (err) {
    console.error("❌ Publish error:", err.message);
  }
};

// ✅ CONSUME
const consume = async (queue, exchange, routingKey, handler) => {
  try {
    const ch = await getChannel();

    await ch.assertExchange(exchange, "topic", { durable: true });

    await ch.assertQueue(queue, { durable: true });

    await ch.bindQueue(queue, exchange, routingKey);

    console.log(`👂 Listening: ${queue}`);

    ch.consume(queue, async (msg) => {
      if (!msg) return;

      try {
        const data = JSON.parse(msg.content.toString());

        await handler(data);

        ch.ack(msg);
      } catch (err) {
        console.error("❌ Consume error:", err.message);
        ch.nack(msg, false, false);
      }
    });
  } catch (err) {
    console.error("❌ Consume setup error:", err.message);
  }
};

module.exports = {
  connect,
  publish,
  consume,
  getChannel, // 👈 QUAN TRỌNG
};