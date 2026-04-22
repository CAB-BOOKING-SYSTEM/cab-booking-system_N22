const express = require("express");

const ReviewController = require("../../review.controller");
const authMiddleware = require("../middleware/auth");

const router = express.Router();

// Zero Trust: all review-service routes require valid JWT.
router.use(authMiddleware);

router.post("/", ReviewController.createReview);
router.post("/report", ReviewController.createReport);

module.exports = router;
