const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const reviewRoutes = require("./routes/review.routes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Service is running smoothly!",
    timestamp: new Date().toISOString(),
    service: "Review Service",
  });
});

app.use("/api/v1/reviews", reviewRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((error, req, res, next) => {
  console.error("[App] Unhandled error:", error);
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    message: error.message || "Internal server error",
  });
});

module.exports = app;
