const express = require("express");
const proxy = require("express-http-proxy");
const authMiddleware = require("./middlewares/auth");

const app = express();
app.use(express.json());

const createProxy = (target, prefix) =>
  proxy(target, {
    proxyReqPathResolver: (req) => `${prefix}${req.url}`,
  });

app.use("/auth", createProxy("http://auth-service:3001", "/api/auth"));
app.use(
  "/api/v1/users",
  authMiddleware,
  createProxy("http://user-service:3009", "/api/v1/users"),
);
app.use(
  "/drivers",
  authMiddleware,
  createProxy("http://driver-service:3003", "/api/drivers"),
);
app.use(
  "/bookings",
  authMiddleware,
  createProxy("http://booking-service:3002", "/api"),
);
app.use(
  "/rides",
  authMiddleware,
  createProxy("http://ride-service:3008", "/rides"),
);
app.use(
  "/pricing",
  authMiddleware,
  createProxy("http://pricing-service:3006", "/api/v1"),
);
app.use(
  "/payments",
  authMiddleware,
  createProxy("http://payment-service:3005", "/api/payments"),
);
app.use(
  "/notifications",
  authMiddleware,
  createProxy("http://notification-service:3004", "/notifications"),
);
app.use(
  "/reviews",
  authMiddleware,
  createProxy("http://review-service:3007", "/api/v1/reviews"),
);

module.exports = app;
