const { randomUUID } = require("crypto");

const { getPool } = require("./src/config/database");
const FeatureStoreService = require("./featureStore.service");
const ReviewProducer = require("./review.producer");

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

class ReviewRepository {
  constructor(pool) {
    this.pool = pool;
    this.modelInitPromise = null;
  }

  /**
   * Initialize service-owned PostgreSQL models.
   */
  async initModel() {
    try {
      if (!this.modelInitPromise) {
        this.modelInitPromise = this.pool.query(`
          CREATE TABLE IF NOT EXISTS reviews (
            id UUID PRIMARY KEY,
            booking_id UUID NOT NULL UNIQUE,
            customer_id UUID NOT NULL,
            driver_id UUID NOT NULL,
            rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
            comment TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_reviews_driver_id ON reviews(driver_id);
          CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);

          CREATE TABLE IF NOT EXISTS reports (
            report_id UUID PRIMARY KEY,
            ride_id UUID NOT NULL,
            user_id UUID NOT NULL,
            reason VARCHAR(150) NOT NULL,
            description TEXT,
            status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RESOLVED')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
          );

          CREATE INDEX IF NOT EXISTS idx_reports_ride_id ON reports(ride_id);
          CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
          CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
        `);
      }

      await this.modelInitPromise;
    } catch (error) {
      console.error("[ReviewRepository] initModel error:", error);
      throw error;
    }
  }

  async findByBookingId(bookingId) {
    try {
      const query = `
        SELECT id, booking_id, customer_id, driver_id, rating, comment, status, created_at
        FROM reviews
        WHERE booking_id = $1
        LIMIT 1;
      `;

      const result = await this.pool.query(query, [bookingId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error("[ReviewRepository] findByBookingId error:", error);
      throw error;
    }
  }

  async create({ bookingId, customerId, driverId, rating, comment }) {
    try {
      const reviewId = randomUUID();

      const query = `
        INSERT INTO reviews (id, booking_id, customer_id, driver_id, rating, comment, status)
        VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE')
        RETURNING id, booking_id, customer_id, driver_id, rating, comment, status, created_at;
      `;

      const result = await this.pool.query(query, [
        reviewId,
        bookingId,
        customerId,
        driverId,
        rating,
        comment,
      ]);

      return result.rows[0];
    } catch (error) {
      console.error("[ReviewRepository] create error:", error);

      if (error.code === "23505") {
        throw new AppError("This booking has already been reviewed", 409);
      }

      throw error;
    }
  }

  async createReport({ rideId, userId, reason, description }) {
    try {
      const reportId = randomUUID();

      const query = `
        INSERT INTO reports (report_id, ride_id, user_id, reason, description, status)
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
        RETURNING report_id, ride_id, user_id, reason, description, status, created_at;
      `;

      const result = await this.pool.query(query, [reportId, rideId, userId, reason, description]);
      return result.rows[0];
    } catch (error) {
      console.error("[ReviewRepository] createReport error:", error);
      throw error;
    }
  }

  async calculateDriverFeatures(driverId) {
    try {
      const query = `
        SELECT
          COALESCE(AVG(rating)::numeric, 0) AS average_rating,
          COUNT(*)::int AS total_reviews
        FROM reviews
        WHERE driver_id = $1
          AND status = 'ACTIVE';
      `;

      const result = await this.pool.query(query, [driverId]);
      const row = result.rows[0] || { average_rating: 0, total_reviews: 0 };

      return {
        driverId,
        averageRating: Number(parseFloat(row.average_rating || 0).toFixed(2)),
        totalReviews: Number(row.total_reviews || 0),
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("[ReviewRepository] calculateDriverFeatures error:", error);
      throw error;
    }
  }
}

class ReviewService {
  constructor() {
    this.pool = getPool();
    this.repository = new ReviewRepository(this.pool);
    this.featureStoreService = new FeatureStoreService();
    this.reviewProducer = new ReviewProducer();
  }

  validatePayload({ bookingId, rating, comment, tags, tipAmount }) {
    if (!bookingId) {
      throw new AppError("bookingId is required", 400);
    }

    const normalizedRating = Number(rating);
    if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
      throw new AppError("rating must be an integer between 1 and 5", 400);
    }

    let normalizedComment = null;
    if (comment !== undefined && comment !== null) {
      normalizedComment = String(comment).trim();
      if (normalizedComment.length > 1000) {
        throw new AppError("comment must be less than or equal to 1000 characters", 400);
      }
    }

    let normalizedTags = [];
    if (tags !== undefined) {
      if (!Array.isArray(tags)) {
        throw new AppError("tags must be an array of strings", 400);
      }

      normalizedTags = tags
        .map((tag) => String(tag).trim())
        .filter((tag) => tag.length > 0);
    }

    let normalizedTipAmount = 0;
    if (tipAmount !== undefined && tipAmount !== null) {
      normalizedTipAmount = Number(tipAmount);
      if (!Number.isFinite(normalizedTipAmount) || normalizedTipAmount < 0) {
        throw new AppError("tipAmount must be a number greater than or equal to 0", 400);
      }
      normalizedTipAmount = Number(normalizedTipAmount.toFixed(2));
    }

    return {
      bookingId,
      rating: normalizedRating,
      comment: normalizedComment,
      tags: normalizedTags,
      tipAmount: normalizedTipAmount,
    };
  }

  validateReportPayload({ rideId, reason, description }) {
    if (!rideId) {
      throw new AppError("rideId is required", 400);
    }

    if (!reason) {
      throw new AppError("reason is required", 400);
    }

    const normalizedReason = String(reason).trim();
    if (!normalizedReason) {
      throw new AppError("reason is required", 400);
    }

    if (normalizedReason.length > 150) {
      throw new AppError("reason must be less than or equal to 150 characters", 400);
    }

    let normalizedDescription = null;
    if (description !== undefined && description !== null) {
      normalizedDescription = String(description).trim();
      if (normalizedDescription.length > 1500) {
        throw new AppError("description must be less than or equal to 1500 characters", 400);
      }
    }

    return {
      rideId,
      reason: normalizedReason,
      description: normalizedDescription,
    };
  }

  /**
   * Review data pipeline:
   * 1) Validate payload and booking readiness
   * 2) Save review to PostgreSQL
   * 3) Recompute and update driver features in Redis
   * 4) Publish review.created event to RabbitMQ (with tipAmount if > 0)
   */
  async createReview({ customerId, bookingId, rating, comment, tags, tipAmount }) {
    try {
      const normalizedPayload = this.validatePayload({
        bookingId,
        rating,
        comment,
        tags,
        tipAmount,
      });

      await this.repository.initModel();

      const readyState = await this.featureStoreService.getBookingReadyState(
        normalizedPayload.bookingId
      );

      if (!readyState || readyState.status !== "READY_FOR_REVIEW") {
        throw new AppError("Booking is not ready for review", 400);
      }

      if (String(readyState.customerId) !== String(customerId)) {
        throw new AppError("You cannot review another customer's booking", 403);
      }

      const existingReview = await this.repository.findByBookingId(normalizedPayload.bookingId);
      if (existingReview) {
        throw new AppError("This booking has already been reviewed", 409);
      }

      const createdReview = await this.repository.create({
        bookingId: normalizedPayload.bookingId,
        customerId,
        driverId: readyState.driverId,
        rating: normalizedPayload.rating,
        comment: normalizedPayload.comment,
      });

      const driverFeatures = await this.repository.calculateDriverFeatures(readyState.driverId);
      await this.featureStoreService.setDriverFeatures(readyState.driverId, driverFeatures);

      const eventData = {
        reviewId: createdReview.id,
        bookingId: createdReview.booking_id,
        customerId: createdReview.customer_id,
        driverId: createdReview.driver_id,
        rating: createdReview.rating,
        tags: normalizedPayload.tags,
      };

      if (normalizedPayload.tipAmount > 0) {
        eventData.tipAmount = normalizedPayload.tipAmount;
      }

      const publishedEvent = await this.reviewProducer.publishReviewCreated(eventData);

      return {
        id: createdReview.id,
        bookingId: createdReview.booking_id,
        customerId: createdReview.customer_id,
        driverId: createdReview.driver_id,
        rating: createdReview.rating,
        comment: createdReview.comment,
        status: createdReview.status,
        createdAt: createdReview.created_at,
        tags: normalizedPayload.tags,
        tipAmount: normalizedPayload.tipAmount,
        driverFeatures,
        eventId: publishedEvent.eventId,
      };
    } catch (error) {
      console.error("[ReviewService] createReview error:", error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create review", 500);
    }
  }

  /**
   * Trip report API:
   * Save customer incident report for ride follow-up workflow.
   */
  async createReport({ userId, rideId, reason, description }) {
    try {
      const normalizedPayload = this.validateReportPayload({
        rideId,
        reason,
        description,
      });

      await this.repository.initModel();

      const createdReport = await this.repository.createReport({
        rideId: normalizedPayload.rideId,
        userId,
        reason: normalizedPayload.reason,
        description: normalizedPayload.description,
      });

      return {
        reportId: createdReport.report_id,
        rideId: createdReport.ride_id,
        userId: createdReport.user_id,
        reason: createdReport.reason,
        description: createdReport.description,
        status: createdReport.status,
        createdAt: createdReport.created_at,
      };
    } catch (error) {
      console.error("[ReviewService] createReport error:", error);

      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Failed to create report", 500);
    }
  }
}

module.exports = ReviewService;
