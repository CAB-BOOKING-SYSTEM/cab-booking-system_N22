// app.js
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";

import apiRoutes from "./api/api.js"; // ← Import từ file gom
import redisClient from "./core/redis.js";
import mtls from "../../../shared/mtls.cjs";

const app = express();

// ====================== MIDDLEWARE ======================
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ====================== ROUTES ======================
app.use("/api", apiRoutes); // ← Dùng /api làm prefix chung

// ====================== ERROR HANDLING ======================
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// ====================== START SERVER ======================
const PORT = process.env.PORT || 3001;
const server = mtls.createServer(app);
const protocol = mtls.getProtocol();

server.listen(PORT, () => {
  console.log(`🚀 Auth Service is running on ${protocol}://localhost:${PORT}`);
  console.log(`📡 API Base URL: ${protocol}://localhost:${PORT}/api`);
});

// Graceful Shutdown
process.on("SIGTERM", async () => {
  console.log("🛑 Shutting down gracefully...");
  await new Promise((resolve) => server.close(resolve));
  await redisClient.quit();
  process.exit(0);
});
