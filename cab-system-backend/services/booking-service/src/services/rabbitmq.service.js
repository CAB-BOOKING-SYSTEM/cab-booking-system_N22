// src/services/rabbitmq.service.js
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

class RabbitMQService {
  constructor(config) {
    this.url = config.rabbitmq.url;
    this.exchange = config.rabbitmq.exchange;
    this.queue = config.rabbitmq.queue;
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
  }
  
  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      
      // Assert exchange (topic exchange for routing)
      await this.channel.assertExchange(this.exchange, 'topic', { durable: true });
      
      // Assert queue for this service
      await this.channel.assertQueue(this.queue, { durable: true });
      
      // Bind queue to relevant routing keys
      const routingKeys = ['booking.accepted', 'ride.completed', 'ride.cancelled'];
      for (const key of routingKeys) {
        await this.channel.bindQueue(this.queue, this.exchange, key);
      }
      
      this.isConnected = true;
      console.log(`✅ RabbitMQ connected: ${this.url}`);
      
      // Handle connection close
      this.connection.on('close', () => {
        console.log('⚠️ RabbitMQ connection closed, attempting to reconnect...');
        this.isConnected = false;
        setTimeout(() => this.connect(), 5000);
      });
      
      return this.channel;
    } catch (error) {
      console.error('❌ RabbitMQ connection error:', error.message);
      this.isConnected = false;
      setTimeout(() => this.connect(), 5000);
      return null;
    }
  }
  
  async publish(routingKey, message, options = {}) {
    if (!this.isConnected || !this.channel) {
      console.warn(`⚠️ Cannot publish ${routingKey}: RabbitMQ not connected`);
      return false;
    }
    
    try {
      const payload = {
        eventId: uuidv4(),
        eventType: routingKey,
        timestamp: new Date().toISOString(),
        data: message
      };
      
      this.channel.publish(
        this.exchange,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true, ...options }
      );
      
      console.log(`📤 Event published: ${routingKey}`, { bookingId: message.bookingId });
      return true;
    } catch (error) {
      console.error(`❌ Failed to publish ${routingKey}:`, error.message);
      return false;
    }
  }
  
  async consume(handlers) {
    if (!this.isConnected || !this.channel) {
      console.warn('⚠️ Cannot consume: RabbitMQ not connected');
      return;
    }
    
    await this.channel.consume(this.queue, async (msg) => {
      if (!msg) return;
      
      try {
        const content = JSON.parse(msg.content.toString());
        const { eventType, data } = content;
        
        console.log(`📥 Event received: ${eventType}`, { bookingId: data?.bookingId });
        
        if (handlers[eventType]) {
          await handlers[eventType](data);
          this.channel.ack(msg);
        } else {
          console.warn(`⚠️ No handler for event type: ${eventType}`);
          this.channel.ack(msg); // Still ack to avoid infinite loop
        }
      } catch (error) {
        console.error(`❌ Error processing message:`, error.message);
        // Negative acknowledge with requeue = false to avoid infinite retry
        this.channel.nack(msg, false, false);
      }
    });
  }
  
  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    this.isConnected = false;
  }
}

module.exports = RabbitMQService;