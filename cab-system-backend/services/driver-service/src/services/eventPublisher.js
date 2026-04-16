const amqp = require('amqplib');
const logger = require('../utils/logger');

class EventPublisher {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchange = 'driver.events';
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      logger.info('✅ Event Publisher connected to RabbitMQ');
      return true;
    } catch (error) {
      logger.error('❌ Failed to connect to RabbitMQ:', error.message);
      return false;
    }
  }

  async publishEvent(routingKey, eventData) {
    if (!this.channel) return false;
    try {
      const event = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType: routingKey,
        timestamp: new Date().toISOString(),
        data: eventData
      };
      this.channel.publish(this.exchange, routingKey, Buffer.from(JSON.stringify(event)), { persistent: true });
      logger.debug(`📤 Event published: ${routingKey}`);
      return true;
    } catch (error) {
      logger.error('Failed to publish event:', error);
      return false;
    }
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}

module.exports = new EventPublisher();