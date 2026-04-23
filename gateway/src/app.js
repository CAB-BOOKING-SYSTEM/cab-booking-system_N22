const express = require("express");
const proxy = require("express-http-proxy");
const { protect } = require("./middlewares/auth");

const app = express();
app.use(express.json());

const createProxy = (target, prefix) =>
  proxy(target, {
    proxyReqPathResolver: (req) => `${prefix}${req.url}`,
    proxyErrorHandler: (err, res, next) => {
      console.error('Proxy error:', err);
      res.status(500).json({ message: 'Service unavailable' });
    },
  });

// Auth routes (không cần auth)
app.use("/auth", createProxy("http://auth-service:3001", "/api/auth"));

// Các routes cần auth
app.use(
  "/api/v1/users",
  protect,
  createProxy("http://user-service:3009", "/api/v1/users"),
);
app.use(
  "/drivers",
  protect,
  createProxy("http://driver-service:3003", "/api/drivers"),
);
app.use(
  "/bookings",
  protect,
  createProxy("http://booking-service:3002", ""),
);
app.use(
  "/rides",
  protect,
  createProxy("http://ride-service:3008", "/rides"),
);
app.use(
  "/pricing",
  protect,
  createProxy("http://pricing-service:3006", "/api/v1"),
);
app.use(
  "/payments",
  protect,
  createProxy("http://payment-service:3005", "/api/payments"),
);
app.use(
  "/notifications",
  protect,
  createProxy("http://notification-service:3004", "/notifications"),
);
app.use(
  "/reviews",
  protect,
  createProxy("http://review-service:3007", "/api/v1/reviews"),
);

module.exports = app;