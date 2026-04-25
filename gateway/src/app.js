const express = require("express");
const proxy = require("express-http-proxy");
const cors = require("cors"); // ← THÊM DÒNG NÀY
const authMiddleware = require("./middlewares/auth");
const mtls = require("/shared/mtls.cjs");

const gatewayAgent = mtls.createClientAgent();
const useMtls = Boolean(gatewayAgent);

const app = express();

// ← THÊM CORS VÀO ĐÂY
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

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
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (gatewayAgent) {
        proxyReqOpts.agent = gatewayAgent;
        proxyReqOpts.rejectUnauthorized = true;
      }
      
      if (srcReq.user) {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.sub || srcReq.user.id || srcReq.user._id || srcReq.user.userId || '';
        proxyReqOpts.headers['x-user-role'] = srcReq.user.role || srcReq.user.roles || '';
      }

      return proxyReqOpts;
    },
  });

const serviceUrl = (host, port) =>
  useMtls ? `https://${host}:${port}` : `http://${host}:${port}`;

// Auth routes - no authentication required
app.use("/auth", createProxy(serviceUrl("auth-service", 3001), "/api/auth"));

// Protected API routes - all require authentication
app.use(
  "/api/v1/users",
  authMiddleware,
  createProxy(serviceUrl("user-service", 3009), "/api/v1/users"),
);

app.use(
  "/api/drivers",
  authMiddleware,
  createProxy(serviceUrl("driver-service", 3003), "/api/drivers"),
);

app.use(
  "/api/bookings",
  authMiddleware,
  createProxy(serviceUrl("booking-service", 3002), "/api/bookings"),
);

app.use(
  "/api/rides",
  authMiddleware,
  createProxy(serviceUrl("ride-service", 3008), "/api/rides"),
);

app.use(
  "/api/pricing",
  authMiddleware,
  createProxy(serviceUrl("pricing-service", 3006), "/api/v1"),
);

app.use(
  "/api/payments",
  authMiddleware,
  createProxy(serviceUrl("payment-service", 3005), "/api/payments"),
);

app.use(
  "/api/notifications",
  authMiddleware,
  createProxy(serviceUrl("notification-service", 3004), "/api/notifications"),
);

app.use(
  "/reviews",
  authMiddleware,
  proxy(serviceUrl("review-service", 3007), {
    proxyReqPathResolver: (req) => `/api/v1/reviews${req.url}`,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (gatewayAgent) {
        proxyReqOpts.agent = gatewayAgent;
        proxyReqOpts.rejectUnauthorized = true;
      }
      proxyReqOpts.headers["x-gateway-proxy"] = "true";
      if (srcReq.user) {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.sub || srcReq.user.id || srcReq.user._id || srcReq.user.userId || '';
        proxyReqOpts.headers['x-user-role'] = srcReq.user.role || srcReq.user.roles || '';
      }
      return proxyReqOpts;
    },
  }),
);

// Backward-compatible alias
app.use(
  "/api/reviews",
  authMiddleware,
  proxy(serviceUrl("review-service", 3007), {
    proxyReqPathResolver: (req) => `/api/v1/reviews${req.url}`,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      if (gatewayAgent) {
        proxyReqOpts.agent = gatewayAgent;
        proxyReqOpts.rejectUnauthorized = true;
      }
      proxyReqOpts.headers["x-gateway-proxy"] = "true";
      if (srcReq.user) {
        proxyReqOpts.headers['x-user-id'] = srcReq.user.sub || srcReq.user.id || srcReq.user._id || srcReq.user.userId || '';
        proxyReqOpts.headers['x-user-role'] = srcReq.user.role || srcReq.user.roles || '';
      }
      return proxyReqOpts;
    },
  }),
);

app.use(
  "/api/matching",
  authMiddleware,
  createProxy(serviceUrl("matching-service", 3010), "/api/matching"),
);

module.exports = app;
