const { Kafka } = require("kafkajs")

const kafka = new Kafka({
  clientId: "ride-service",
  brokers: ["localhost:9092"]
})

const producer = kafka.producer()

async function sendEvent(topic, data) {
  await producer.connect()

  await producer.send({
    topic,
    messages: [
      { value: JSON.stringify(data) }
    ]
  })
}

module.exports = sendEvent