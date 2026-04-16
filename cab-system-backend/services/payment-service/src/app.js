const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/payments", require("./routes/payment.routes"));
// 🔥 thêm dòng này
app.use("/api/test", require("./routes/test.route"));
app.get("/", (req, res) => res.json({ message: "Payment Service is running" }));
app.get("/success", (req, res) => {
  res.send("✅ PAYMENT SUCCESS");
});

app.get("/failed", (req, res) => {
  res.send("❌ PAYMENT FAILED");
});
module.exports = app;
