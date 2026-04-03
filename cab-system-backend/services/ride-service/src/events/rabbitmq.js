const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    console.log("RabbitMQ connected in Ride Service");
  } catch (error) {
    console.error("RabbitMQ connection error:", error);
    // Don't exit immediately, retry or handle gracefully
  }
}

async function publishEvent(queue, message) {
  if (!channel) {
    console.error("RabbitMQ channel not initialized");
    return;
  }
  await channel.assertQueue(queue, { durable: true });
  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { persistent: true });
}

module.exports = { connectRabbitMQ, publishEvent };
