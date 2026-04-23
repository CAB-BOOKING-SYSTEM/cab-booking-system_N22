// services/payment-service/src/app.js
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/payments", require("./routes/payment.routes"));

app.get("/", (req, res) => res.json({ message: "Payment Service running", status: "ok" }));

// Health check cho Docker
app.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = app;