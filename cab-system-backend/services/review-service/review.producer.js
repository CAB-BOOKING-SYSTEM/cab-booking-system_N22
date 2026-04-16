const { randomUUID } = require("crypto");
const { connectRabbitMQ, getRabbitMQChannel } = require("./src/config/rabbitmq");

class ReviewProducer {
  constructor() {
    this.exchange = "review.events";
    this.routingKey = "review.created";
    this.exchangeAsserted = false;
  }

  async connect() {
    try {
      await connectRabbitMQ();

      if (!this.exchangeAsserted) {
        const channel = await getRabbitMQChannel();
        await channel.assertExchange(this.exchange, "topic", {
          durable: true,
        });

        this.exchangeAsserted = true;
        console.log("[ReviewProducer] Exchange asserted");
      }
    } catch (error) {
      console.error("[ReviewProducer] connect error:", error);
      throw error;
    }
  }

  /**
   * Data pipeline step 4:
   * Publish review.created event with standard envelope pattern.
   */
  async publishReviewCreated(data) {
    try {
      await this.connect();

      const envelope = {
        eventId: randomUUID(),
        eventType: "review.created",
        timestamp: new Date().toISOString(),
        data,
      };

      const channel = await getRabbitMQChannel();
      const isPublished = channel.publish(
        this.exchange,
        this.routingKey,
        Buffer.from(JSON.stringify(envelope)),
        {
          persistent: true,
          contentType: "application/json",
        }
      );

      if (!isPublished) {
        throw new Error("RabbitMQ buffer is full, publish failed");
      }

      return envelope;
    } catch (error) {
      console.error("[ReviewProducer] publishReviewCreated error:", error);
      throw error;
    }
  }
}

module.exports = ReviewProducer;
