const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const paymentRoutes = require("./routes/paymentsRoute");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes
app.use("/api/payments", paymentRoutes);

// Test route — chỉ mount khi không phải production
if (process.env.NODE_ENV !== "production") {
  const testRoute = require("./routes/testRoute");
  app.use("/api/payments/test", testRoute);
  console.log("⚠️  Test route enabled: POST /api/payments/test");
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "Payment service OK" });
});

module.exports = app;