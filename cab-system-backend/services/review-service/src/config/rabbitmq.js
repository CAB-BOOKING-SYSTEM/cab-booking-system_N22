const amqp = require("amqplib");

let rabbitConnection = null;
let rabbitChannel = null;

const getRabbitMqConfig = () => {
  const rabbitmqUrl =
    process.env.RABBITMQ_URL ||
    `amqp://${process.env.RABBITMQ_USER || "admin"}:${process.env.RABBITMQ_PASS || "password123"}@${process.env.RABBITMQ_HOST || "localhost"}:${process.env.RABBITMQ_PORT_NODE || 5672}`;

  return {
    rabbitmqUrl,
  };
};

const connectRabbitMQ = async () => {
  try {
    if (!rabbitConnection || !rabbitChannel) {
      const { rabbitmqUrl } = getRabbitMqConfig();
      rabbitConnection = await amqp.connect(rabbitmqUrl);
      rabbitChannel = await rabbitConnection.createChannel();

      rabbitConnection.on("error", (error) => {
        console.error("[RabbitMQ] Connection error:", error);
      });

      rabbitConnection.on("close", () => {
        console.warn("[RabbitMQ] Connection closed");
      });

      console.log("[RabbitMQ] RabbitMQ connected successfully");
    }

    return {
      connection: rabbitConnection,
      channel: rabbitChannel,
    };
  } catch (error) {
    console.error("[RabbitMQ] RabbitMQ connection failed:", error);
    throw error;
  }
};

const getRabbitMQChannel = async () => {
  const { channel } = await connectRabbitMQ();
  return channel;
};

module.exports = {
  connectRabbitMQ,
  getRabbitMQChannel,
};
