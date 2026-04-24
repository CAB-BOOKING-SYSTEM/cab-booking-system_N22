const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/payments", require("./routes/payment.routes"));

app.get("/", (req, res) => {
  res.json({ message: "Payment Service running" });
});

module.exports = app;