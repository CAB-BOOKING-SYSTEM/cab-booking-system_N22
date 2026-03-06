const amqp = require("amqplib");

let connection;
let channel;

const connect = async () => {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    // Tự reconnect khi mất kết nối
    connection.on("close", () => {
      console.error("RabbitMQ connection closed, reconnecting in 5s...");
      setTimeout(connect, 5000);
    });

    connection.on("error", (err) => {
      console.error("RabbitMQ connection error:", err.message);
    });

    console.log("RabbitMQ connected");
  } catch (error) {
    console.error("RabbitMQ connection error:", error.message);
    console.log("Retrying in 5s...");
    setTimeout(connect, 5000);
  }
};

const getChannel = () => {
  if (!channel) throw new Error("RabbitMQ channel not initialized");
  return channel;
};

const publish = async (queue, message) => {
  try {
    const ch = getChannel();
    await ch.assertQueue(queue, { durable: true });
    ch.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true,
    });
    console.log(`[MQ] Published to "${queue}":`, message);
  } catch (error) {
    console.error("Publish error:", error.message);
  }
};

const consume = async (queue, callback) => {
  try {
    const ch = getChannel();
    await ch.assertQueue(queue, { durable: true });

    ch.consume(queue, (msg) => {
      if (msg) {
        const data = JSON.parse(msg.content.toString());
        callback(data, msg);
      }
    });

    console.log(`[MQ] Consuming queue: "${queue}"`);
  } catch (error) {
    console.error("Consume error:", error.message);
  }
};

const ack = (msg) => {
  try {
    getChannel().ack(msg);
  } catch (error) {
    console.error("Ack error:", error.message);
  }
};

const nack = (msg, requeue = false) => {
  try {
    getChannel().nack(msg, false, requeue);
  } catch (error) {
    console.error("Nack error:", error.message);
  }
};

module.exports = { connect, getChannel, publish, consume, ack, nack };