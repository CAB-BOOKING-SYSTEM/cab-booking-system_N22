const amqp = require("amqplib");

let connection = null;
let channel = null;
let reconnectTimer = null;

async function connectRabbitMQ() {
  // Clear any existing timer to avoid multiple loops
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  try {
    console.log("🔄 Attempting to connect to RabbitMQ...");
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    
    connection.on("error", (err) => {
      console.error("❌ RabbitMQ connection error:", err.message);
    });

    connection.on("close", () => {
      console.error("⚠️ RabbitMQ connection closed. Reconnecting...");
      connection = null;
      channel = null;
      scheduleReconnect();
    });

    channel = await connection.createChannel();
    
    channel.on("error", (err) => {
      console.error("❌ RabbitMQ channel error:", err.message);
    });

    channel.on("close", () => {
      console.warn("⚠️ RabbitMQ channel closed.");
      channel = null;
    });

    console.log("✅ RabbitMQ connected in Ride Service");
  } catch (error) {
    console.error("❌ RabbitMQ connection failed:", error.message);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (!reconnectTimer) {
    reconnectTimer = setTimeout(connectRabbitMQ, 5000);
  }
}

async function publishEvent(queue, message) {
  try {
    if (!channel) {
      console.error("❌ RabbitMQ channel not available. Event lost:", queue);
      return false;
    }
    
    await channel.assertQueue(queue, { durable: true });
    channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), { 
      persistent: true 
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error publishing msg to queue ${queue}:`, error.message);
    // If it's a channel closed error, reset channel so next attempt might trigger reconnect log or handle it
    if (error.message.includes("closed")) {
      channel = null;
    }
    return false;
  }
}

module.exports = { connectRabbitMQ, publishEvent };
