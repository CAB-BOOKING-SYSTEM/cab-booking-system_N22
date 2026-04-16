const express = require("express");

const ReviewController = require("../../review.controller");

const router = express.Router();

let authMiddleware = null;

try {
  authMiddleware = require("../../../../gateway/src/middlewares/auth");
} catch (error) {
  console.warn("[ReviewRoutes] Auth middleware not found, route will run without auth middleware");
}

if (authMiddleware) {
  router.post("/", authMiddleware, ReviewController.createReview);
} else {
  router.post("/", ReviewController.createReview);
}

module.exports = router;
