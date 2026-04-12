const amqp = require("amqplib");

let channel = null;

const connectRabbitMQ = async () => {
  let retries = 5;

  while (retries) {
    try {
      const conn = await amqp.connect(process.env.RABBITMQ_URL);
      channel = await conn.createChannel();
      console.log("🐰 RabbitMQ connected");
      break;
    } catch (err) {
      console.log("⏳ Waiting for RabbitMQ...");
      retries--;
      await new Promise(res => setTimeout(res, 3000));
    }
  }

  if (!channel) {
    throw new Error("❌ Cannot connect to RabbitMQ");
  }
};

const getChannel = () => {
  if (!channel) throw new Error("Channel not ready");
  return channel;
};

module.exports = { connectRabbitMQ, getChannel };