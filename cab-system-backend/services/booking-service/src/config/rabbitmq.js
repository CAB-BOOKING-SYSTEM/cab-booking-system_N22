const amqp = require("amqplib");

let channel;

async function connectRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await connection.createChannel();

  await channel.assertQueue("booking_created");

  console.log("RabbitMQ connected");
}

function getChannel() {
  return channel;
}

module.exports = { connectRabbitMQ, getChannel };