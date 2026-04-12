const express = require("express");
const router = express.Router();
const messageBroker = require("../utils/messageBroker");

// 🔥 TEST PUBLISH
router.post("/publish", async (req, res) => {
  const payload = req.body;

  if (!payload || Object.keys(payload).length === 0) {
    return res.status(400).json({ error: "Payload is required" });
  }

  try {
    await messageBroker.publish(
      "ride.events",
      "ride.completed",
      payload
    );

    res.json({ message: "✅ Event published" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Publish failed" });
  }
});

module.exports = router;