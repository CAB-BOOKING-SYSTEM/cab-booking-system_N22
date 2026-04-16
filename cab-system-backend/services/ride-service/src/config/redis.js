const { createClient } = require("redis")

const redis = createClient({
  url: "redis://localhost:6379"
})

redis.connect()

module.exports = redis