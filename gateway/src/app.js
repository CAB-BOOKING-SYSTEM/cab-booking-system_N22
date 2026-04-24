const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors");  // ← THÊM DÒNG NÀY
const authMiddleware = require("./middlewares/auth");

const app = express();

// ← THÊM CORS VÀO ĐÂY
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const createProxy = (target, prefix) =>
  proxy(target, {
    proxyReqPathResolver: (req) => {
      // Loại bỏ prefix khỏi req.url nếu có
      let path = req.url;
      if (path.startsWith(prefix)) {
        path = path.slice(prefix.length);
      }
      return `${prefix}${path}`;
    },
  });

// Auth routes - no authentication required
app.use("/auth", createProxy("http://auth-service:3001", "/api/auth"));


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
  "/reviews",
  authMiddleware,
  proxy("http://review-service:3007", {
    proxyReqPathResolver: (req) => `/api/v1/reviews${req.url}`,
    proxyReqOptDecorator: (proxyReqOpts) => {
      proxyReqOpts.headers["x-gateway-proxy"] = "true";
      return proxyReqOpts;
    },
  }),
);

// Backward-compatible alias
app.use(
  "/api/reviews",
  authMiddleware,
  proxy("http://review-service:3007", {
    proxyReqPathResolver: (req) => `/api/v1/reviews${req.url}`,
    proxyReqOptDecorator: (proxyReqOpts) => {
      proxyReqOpts.headers["x-gateway-proxy"] = "true";
      return proxyReqOpts;
    },
  }),
);

app.use(
  "/api/matching",
  authMiddleware,
  createProxy("http://matching-service:3010", "/api/matching"),
);

module.exports = app;