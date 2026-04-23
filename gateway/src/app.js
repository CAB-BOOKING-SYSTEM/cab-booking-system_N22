const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");
const authMiddleware = require("./middlewares/auth");

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Cho phép tất cả các origin trong môi trường dev
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());

const createProxy = (target, prefix) =>
  proxy(target, {
    proxyReqPathResolver: (req) => `${prefix}${req.url}`,
  });

// Auth routes - no authentication required
// Prefix là trống vì frontend gửi /api/auth và backend auth-service cũng nhận /api/auth
app.use("/auth", createProxy("http://auth-service:3001", ""));

// Protected API routes - all require authentication
app.use(
  "/api/v1/users",
  authMiddleware,
  createProxy("http://user-service:3009", "/api/v1/users"),
);

app.use(
  "/api/drivers",
  authMiddleware,
  createProxy("http://driver-service:3003", "/api/drivers"),
);

app.use(
  "/api/bookings",
  authMiddleware,
  createProxy("http://booking-service:3002", "/api/bookings"),
);

app.use(
  "/api/rides",
  authMiddleware,
  createProxy("http://ride-service:3008", "/api/rides"),
);

app.use(
  "/api/pricing",
  authMiddleware,
  createProxy("http://pricing-service:3006", "/api/v1"),
);

app.use(
  "/api/payments",
  authMiddleware,
  createProxy("http://payment-service:3005", "/api/payments"),
);

app.use(
  "/api/notifications",
  authMiddleware,
  createProxy("http://notification-service:3004", "/api/notifications"),
);

app.use(
  "/api/reviews",
  authMiddleware,
  createProxy("http://review-service:3007", "/api/v1/reviews"),
);

app.use(
  "/api/matching",
  authMiddleware,
  createProxy("http://matching-service:3010", "/api/matching"),
);

// Backward compatibility for old matching path
app.use(
  "/matching",
  createProxy("http://matching-service:3010", "/api/matching"),
);

module.exports = app;
