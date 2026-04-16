const FeatureStoreService = require("./featureStore.service");
const { connectRabbitMQ, getRabbitMQChannel } = require("./src/config/rabbitmq");

class PaymentConsumer {
  constructor() {
    this.exchange = "payment.events";
    this.routingKey = "payment.completed";
    this.queue = process.env.PAYMENT_COMPLETED_QUEUE || "review.payment.completed.queue";

    this.channel = null;
    this.featureStoreService = new FeatureStoreService();
  }

  async connect() {
    try {
      await connectRabbitMQ();
      this.channel = await getRabbitMQChannel();

      await this.channel.assertExchange(this.exchange, "topic", {
        durable: true,
      });

      await this.channel.assertQueue(this.queue, {
        durable: true,
      });

      await this.channel.bindQueue(this.queue, this.exchange, this.routingKey);

      console.log("[PaymentConsumer] Connected and bound queue");
    } catch (error) {
      console.error("[PaymentConsumer] connect error:", error);
      throw error;
    }
  }

  async handleMessage(message) {
    try {
      const rawPayload = message.content.toString();
      const envelope = JSON.parse(rawPayload);

      const bookingData = envelope?.data;
      if (!bookingData) {
        throw new Error("Invalid payment event: missing data");
      }

      if (bookingData.status !== "COMPLETED") {
        console.log("[PaymentConsumer] Ignore non-completed payment event", envelope.eventId);
        return;
      }

      // Step 5 - store booking state as ready-for-review for POST /reviews validation.
      await this.featureStoreService.markBookingReadyForReview({
        bookingId: bookingData.bookingId,
        customerId: bookingData.customerId,
        driverId: bookingData.driverId,
      });

      console.log(
        `[PaymentConsumer] Booking ${bookingData.bookingId} marked as READY_FOR_REVIEW`
      );
    } catch (error) {
      console.error("[PaymentConsumer] handleMessage error:", error);
      throw error;
    }
  }

  async start() {
    try {
      await this.connect();

      await this.channel.consume(this.queue, async (message) => {
        if (!message) {
          return;
        }

        try {
          await this.handleMessage(message);
          this.channel.ack(message);
        } catch (error) {
          console.error("[PaymentConsumer] consume error:", error);
          this.channel.nack(message, false, false);
        }
      });

      console.log("[PaymentConsumer] Listening for payment.completed events...");
    } catch (error) {
      console.error("[PaymentConsumer] start error:", error);
      throw error;
    }
  }
}

module.exports = PaymentConsumer;
