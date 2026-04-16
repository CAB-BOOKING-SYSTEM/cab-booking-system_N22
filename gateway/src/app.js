const express = require("express");
const proxy = require("express-http-proxy");
const authMiddleware = require("./middlewares/auth");

const app = express();
app.use(express.json());

app.use("/auth", proxy("http://cab_auth:${AUTH_PORT}"));
app.use("/users", authMiddleware, proxy("http://cab_user:${USER_PORT}"));
app.use("/drivers", authMiddleware, proxy("http://cab_driver:${DRIVER_PORT}"));
app.use("/bookings", authMiddleware, proxy("http://cab_booking:${BOOKING_PORT}"));
app.use("/rides", authMiddleware, proxy("http://cab_ride:${RIDE_PORT}"));
app.use("/pricing", authMiddleware, proxy("http://cab_pricing:${PRICING_PORT}"));
app.use("/payments", authMiddleware, proxy("http://cab_payment:${PAYMENT_PORT}"));
app.use("/notifications", authMiddleware, proxy("http://cab_notification:${NOTIFICATION_PORT}"));
app.use("/reviews", authMiddleware, proxy("http://rb_preview:${REVIEW_PORT}"));

module.exports = app;