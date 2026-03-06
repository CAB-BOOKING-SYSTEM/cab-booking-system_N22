require("dotenv").config()

const app = require("./src/app")
const messageBroker = require("./src/utils/messageBroker")
const paymentService = require("./src/services/paymentsService")

async function start() {
  try {

    console.log("Connecting RabbitMQ...")

    await messageBroker.connect()

    console.log("RabbitMQ connected")

    // start consumer
    await paymentService.startConsumer()

    app.listen(process.env.PORT, () => {
      console.log(`Payment service running on ${process.env.PORT}`)
    })

  } catch (error) {

    console.error("Service start failed:", error)
    process.exit(1)

  }
}

start()