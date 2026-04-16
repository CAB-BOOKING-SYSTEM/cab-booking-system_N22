const amqp = require('amqplib');

let channel;
const EXCHANGE = 'cab.events';

async function connectRabbitMQ() {
  try {
    const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672');
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, 'topic', { durable: true });
    console.log('✅ RabbitMQ connected');
  } catch (error) {
    console.error('❌ RabbitMQ connection failed:', error.message);
  }
}

async function publishEvent(routingKey, eventData) {
  if (!channel) {
    await connectRabbitMQ();
  }
  
  const event = {
    eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: routingKey,
    timestamp: new Date().toISOString(),
    source: 'pricing-service',
    data: eventData
  };
  
  channel.publish(EXCHANGE, routingKey, Buffer.from(JSON.stringify(event)));
  console.log(`📤 Event published: ${routingKey}`);
}

module.exports = { connectRabbitMQ, publishEvent };