const express = require("express");
const proxy = require("express-http-proxy");
const authMiddleware = require("./middlewares/auth");

const app = express();

// 1. Manual CORS middleware (LUÔN ĐỂ TRÊN CÙNG)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With, Accept");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// 2. Body Parser
app.use(express.json());

const createProxy = (target, prefix) =>
  proxy(target, {
    proxyReqPathResolver: (req) => `${prefix}${req.url}`,
    // Đảm bảo không bị mất header khi proxy
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      return proxyReqOpts;
    }
  });

// 3. Routes
// Auth service
app.use("/auth", createProxy("http://auth-service:3001", "/api/auth"));

// Protected routes
app.use("/api/v1/users", authMiddleware, createProxy("http://user-service:3009", "/api/v1/users"));
app.use("/drivers", authMiddleware, createProxy("http://driver-service:3003", "/api/drivers"));
app.use("/bookings", authMiddleware, createProxy("http://booking-service:3002", ""));
app.use("/rides", authMiddleware, createProxy("http://ride-service:3008", "/rides"));
app.use("/pricing", authMiddleware, createProxy("http://pricing-service:3006", "/api/v1"));
app.use("/payments", authMiddleware, createProxy("http://payment-service:3005", "/api/payments"));
app.use("/notifications", authMiddleware, createProxy("http://notification-service:3004", "/notifications"));
app.use("/reviews", authMiddleware, createProxy("http://review-service:3007", "/api/v1/reviews"));
app.use("/matching", createProxy("http://matching-service:3010", "/api/matching"));

module.exports = app;
