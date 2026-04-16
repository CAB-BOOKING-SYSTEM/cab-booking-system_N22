const ReviewService = require("./review.service");

const reviewService = new ReviewService();

/**
 * POST /reviews
 * Body: { bookingId, rating, comment, tags }
 */
const createReview = async (req, res) => {
  try {
    const customerId = req.user?.id || req.headers["x-customer-id"];

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

module.exports = {
  createReview,
};
