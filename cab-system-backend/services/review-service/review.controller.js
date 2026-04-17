const ReviewService = require("./review.service");

const reviewService = new ReviewService();

const getUserIdFromRequest = (req) =>
  req.user?.id || req.user?.sub || req.user?.userId || req.headers["x-customer-id"];

/**
 * POST /reviews
 * Body: { bookingId, rating, comment, tags }
 */
const createReview = async (req, res) => {
  try {
    const customerId = getUserIdFromRequest(req);

    if (!customerId) {
      return res.status(401).json({
        message: "Customer identity is required",
      });
    }

    const createdReview = await reviewService.createReview({
      customerId,
      bookingId: req.body?.bookingId,
      rating: req.body?.rating,
      comment: req.body?.comment,
      tags: req.body?.tags,
    });

    return res.status(201).json({
      message: "Review created successfully",
      data: createdReview,
    });
  } catch (error) {
    console.error("[ReviewController] createReview error:", error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * POST /reviews/report
 * Body: { rideId, reason, description }
 */
const createReport = async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        message: "User identity is required",
      });
    }

    const createdReport = await reviewService.createReport({
      userId,
      rideId: req.body?.rideId,
      reason: req.body?.reason,
      description: req.body?.description,
    });

    return res.status(201).json({
      message: "Trip report created successfully",
      data: createdReport,
    });
  } catch (error) {
    console.error("[ReviewController] createReport error:", error);

    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      message: error.message || "Internal server error",
    });
  }
};

module.exports = {
  createReview,
  createReport,
};
