const { Kafka } = require("kafkajs");

const kafka = new Kafka({
  clientId: "ride-service",
  brokers: [process.env.KAFKA_BROKER || "localhost:9092"],
});

const producer = kafka.producer();

const connectKafka = async () => {
  try {
    await producer.connect();
    console.log("✅ Connected to Kafka as Producer");
  } catch (error) {
    console.error("❌ Error connecting to Kafka:", error);
  }
};

const publishKafkaEvent = async (topic, message) => {
  try {
    await producer.send({
      topic,
      messages: [{ value: JSON.stringify(message) }],
    });
  } catch (error) {
    console.error(`❌ Error publishing msg to topic ${topic}:`, error);
  }
};

module.exports = { connectKafka, publishKafkaEvent };
