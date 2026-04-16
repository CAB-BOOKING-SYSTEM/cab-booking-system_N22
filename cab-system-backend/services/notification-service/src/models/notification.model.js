const mongoose = require("mongoose");

const retryAttemptSchema = new mongoose.Schema(
  {
    attemptedAt: {
      type: Date,
      default: Date.now,
    },
    error: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "userId là bắt buộc"],
      index: true,
      trim: true,
    },
    userRole: {
      type: String,
      enum: {
        values: ["customer", "driver", "admin"],
        message: 'userRole phải là "customer", "driver" hoặc "admin"',
      },
      required: [true, "userRole là bắt buộc"],
    },
    type: {
      type: String,
      required: [true, "type là bắt buộc"],
      trim: true,
    },
    title: {
      type: String,
      required: [true, "title là bắt buộc"],
      trim: true,
      maxlength: [255, "title không được vượt quá 255 ký tự"],
    },
    body: {
      type: String,
      required: [true, "body là bắt buộc"],
      trim: true,
      maxlength: [2000, "body không được vượt quá 2000 ký tự"],
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    metaData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceEventId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["pending", "sent", "failed", "read"],
        message: 'status phải là "pending", "sent", "failed" hoặc "read"',
      },
      default: "pending",
    },
    deliveryMethod: [
      {
        type: String,
        enum: {
          values: ["in_app_socket", "push_fcm", "sms", "email"],
          message: "deliveryMethod không hợp lệ: {VALUE}",
        },
      },
    ],
    errorMessage: {
      type: String,
      default: null,
    },
    retryHistory: {
      type: [retryAttemptSchema],
      default: [],
    },
    retryCount: {
      type: Number,
      default: 0,
      min: [0, "retryCount không được âm"],
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, retryCount: 1 });
notificationSchema.index({ userId: 1, status: 1 });

notificationSchema.methods.markAsRead = function () {
  this.status = "read";
  this.readAt = new Date();
  return this.save();
};

notificationSchema.methods.recordFailure = function (errorMsg) {
  this.retryHistory.push({ attemptedAt: new Date(), error: errorMsg });
  this.retryCount += 1;
  this.errorMessage = errorMsg;
  this.status = "failed";
  return this.save();
};

notificationSchema.methods.markAsSent = function (channel) {
  this.status = "sent";
  this.errorMessage = null;
  if (channel && !this.deliveryMethod.includes(channel)) {
    this.deliveryMethod.push(channel);
  }
  return this.save();
};

notificationSchema.statics.findByUser = function (
  userId,
  page = 1,
  limit = 20,
) {
  const skip = (page - 1) * limit;
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
};

notificationSchema.statics.findPendingRetries = function (maxRetry = 3) {
  return this.find({
    status: "failed",
    retryCount: { $lt: maxRetry },
  }).sort({ updatedAt: 1 });
};

notificationSchema.statics.countUnread = function (userId) {
  return this.countDocuments({ userId, status: "sent" });
};

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;
