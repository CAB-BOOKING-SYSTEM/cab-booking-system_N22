require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ENV
const PORT = process.env.PORT || 3009;
const DB_URL = process.env.DB_URL || "Not configured";

// Log
console.log("🧠 ENV:", process.env.NODE_ENV || "development");
console.log("🗄️ DB:", DB_URL);

// Health check
app.get("/", (req, res) => {
  res.status(200).json({
    message: "User service running 🚀",
    time: new Date().toISOString(),
  });
});

// 👉 ví dụ API user
app.get("/users", (req, res) => {
  res.json([
    { id: 1, name: "User 1" },
    { id: 2, name: "User 2" },
  ]);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 User service running on port ${PORT}`);
});