require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const { connectRabbitMQ } = require("./config/rabbitmq");
const bookingRoutes = require("./routes/booking.routes");

const app = express();

app.use(express.json());

connectDB();
connectRabbitMQ();

app.use("/api", bookingRoutes);

app.get("/health", (req, res) => {
  res.send("Booking service running");
});

const PORT = process.env.BOOKING_PORT || 3002;

app.listen(PORT, () => {
  console.log(`Booking service running on ${PORT}`);
});