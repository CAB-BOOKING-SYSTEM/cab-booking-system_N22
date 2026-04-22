require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { connectDB, sequelize } = require("./config/database");
const { connectRabbitMQ } = require("./events/rabbitmq");
const { connectKafka } = require("./events/kafka");
const { initWebSocket } = require("./gateway/websocket");
const http = require("http");
const rideRoutes = require("./routes/rideRoutes");

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/rides", rideRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ service: "Ride Service", status: "UP", timestamp: new Date() });
});

// Start Server
const start = async () => {
  try {
    // Connect to Database
    await connectDB();
    
    // Sync models
    await sequelize.sync({ alter: true });
    console.log("Database models synced");

    // Connect Brokers
    await connectRabbitMQ();
    await connectKafka();

    // Create HTTP & WebSocket Gateway
    const server = http.createServer(app);
    initWebSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Ride Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start the server:", error);
    process.exit(1);
  }
};

start();