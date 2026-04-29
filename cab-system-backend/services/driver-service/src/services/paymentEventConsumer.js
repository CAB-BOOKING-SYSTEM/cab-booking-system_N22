const amqp = require('amqplib');
const logger = require('../utils/logger');
const walletService = require('./walletService');
const axios = require('axios');
const mtls = require('../../../../../shared/mtls.cjs');

const httpsAgent = mtls.createClientAgent();

class PaymentEventConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.exchangeName = 'payment.events';
    this.queueName = 'driver.payment.events';
    this.routingKey = 'payment.completed';
  }

  async connect() {
    try {
      const rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://admin:password123@rabbitmq:5672';
      this.connection = await amqp.connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();
      
      // Declare exchange
      await this.channel.assertExchange(this.exchangeName, 'topic', { durable: true });
      
      // Declare queue
      await this.channel.assertQueue(this.queueName, { durable: true });
      
      // Bind queue to exchange with routing key
      await this.channel.bindQueue(
        this.queueName,
        this.exchangeName,
        this.routingKey
      );
      
      logger.info('✅ Payment Event Consumer connected to RabbitMQ');
      return true;
    } catch (error) {
      logger.error('❌ Failed to connect Payment Event Consumer:', error.message);
      throw error;
    }
  }

  async startConsuming() {
    if (!this.channel) {
      throw new Error('Channel not initialized. Call connect() first.');
    }

    try {
      // Set QoS (prefetch only 1 message at a time)
      await this.channel.prefetch(1);
      
      // Start consuming
      await this.channel.consume(
        this.queueName,
        async (msg) => {
          if (msg) {
            try {
              const event = JSON.parse(msg.content.toString());
              logger.info(`📦 Payment event received:`, event);
              
              // Process the event
              await this.handlePaymentCompleted(event);
              
              // Acknowledge the message
              this.channel.ack(msg);
              logger.debug(`✅ Message acknowledged for event:`, event.eventId);
            } catch (error) {
              logger.error(`❌ Error processing payment event:`, error);
              // Negative acknowledge - message will be requeued
              this.channel.nack(msg, false, true);
            }
          }
        },
        { noAck: false }
      );
      
      logger.info(`🔊 Payment Event Consumer started listening on queue: ${this.queueName}`);
    } catch (error) {
      logger.error('❌ Error starting consumer:', error);
      throw error;
    }
  }

  async handlePaymentCompleted(event) {
    try {
      const { data } = event;
      const { bookingId, paymentId } = data;
      
      if (!bookingId) {
        throw new Error('Missing bookingId in payment event');
      }

      logger.info(`💳 Processing payment for booking: ${bookingId}`);

      // Step 1: Fetch booking details from Booking Service
      const booking = await this.getBookingDetails(bookingId);
      
      if (!booking) {
        logger.error(`❌ Booking not found: ${bookingId}`);
        throw new Error(`Booking not found: ${bookingId}`);
      }

      const { driverId, estimatedPrice } = booking;
      
      if (!driverId) {
        logger.warn(`⚠️ Booking ${bookingId} has no driver assigned yet`);
        return;
      }

      // Step 2: Get earning amount (use estimated price for now)
      const earningAmount = estimatedPrice?.total || 0;
      
      if (earningAmount <= 0) {
        logger.warn(`⚠️ Invalid earning amount: ${earningAmount} for booking ${bookingId}`);
        return;
      }

      // Step 3: Credit driver's wallet
      const result = await walletService.addEarning(
        driverId,
        earningAmount,
        bookingId,
        `Payment for booking ${bookingId}`
      );

      logger.info(
        `✅ Driver ${driverId} wallet credited with ${earningAmount} for booking ${bookingId}`,
        result
      );
    } catch (error) {
      logger.error('❌ Error in handlePaymentCompleted:', error.message);
      throw error;
    }
  }

  async getBookingDetails(bookingId) {
    try {
      // Try to get from Booking Service
      const bookingServiceUrl = process.env.BOOKING_SERVICE_URL || 'https://booking-service:3002';
      
      const response = await axios.get(
        `${bookingServiceUrl}/api/bookings/${bookingId}`,
        { 
          httpsAgent: httpsAgent,
          timeout: 5000
        }
      );

      if (response.data && response.data.data) {
        return response.data.data;
      }

      logger.warn(`⚠️ Invalid booking service response for ${bookingId}`);
      return null;
    } catch (error) {
      logger.error(`❌ Error fetching booking details for ${bookingId}:`, error.message);
      
      // Return null to skip this event (will be requeued)
      return null;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('✅ Payment Event Consumer connection closed');
    } catch (error) {
      logger.error('Error closing consumer connection:', error);
    }
  }
}

module.exports = new PaymentEventConsumer();
