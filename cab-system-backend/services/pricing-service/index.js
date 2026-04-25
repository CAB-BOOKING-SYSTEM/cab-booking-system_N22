require("dotenv").config();

const express = require("express");
const cors = require("cors");
const app = express();
const mtls = require("../../../shared/mtls.cjs");

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DB_URL || "Chua_cau_hinh_DB";

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log(`APP đang chạy ở chế độ: ${process.env.NODE_ENV}`);
console.log(`Database URL: ${DB_URL}`);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Service is running smoothly!",
    timestamp: new Date().toISOString(),
    service: "Pricing Service",
  });
});

const server = mtls.createServer(app);
const protocol = mtls.getProtocol();

server.listen(PORT, () => {
  console.log(`🚀 Service is running on ${protocol}://localhost:${PORT}`);
});
