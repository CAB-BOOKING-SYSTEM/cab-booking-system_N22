/**
 * @file paymentFailed.schema.js
 * @description Schema định nghĩa cấu trúc payload cho event: payment.failed
 * @topic payment.failed
 * @producer Payment Service
 * @consumer Notification Service
 *
 * Sự kiện được bắn ra khi Payment Service thất bại trong việc charge tiền.
 * Dùng để thông báo cho khách hàng đổi phương thức thanh toán hoặc thử lại.
 */

/**
 * @typedef {Object} PaymentFailedPayload
 * @property {string} eventId    - ID duy nhất của sự kiện (VD: "evt_9f8e7d6c5b")
 * @property {string} type       - Loại sự kiện, luôn là "PaymentFailed"
 * @property {string} rideId     - ID của chuyến đi liên quan (VD: "ride_102938")
 * @property {string} userId     - ID người dùng cần được thông báo (VD: "cust_556677")
 * @property {number} amount     - Số tiền đã cố gắng thanh toán (đơn vị theo currency)
 * @property {string} currency   - Đơn vị tiền tệ (VD: "VND", "USD")
 * @property {string} reason     - Lý do thất bại (VD: "Insufficient funds or Card expired")
 * @property {number} retryCount - Số lần đã thử lại (bắt đầu từ 1)
 * @property {string} timestamp  - Thời điểm sự kiện xảy ra (ISO 8601)
 */

/**
 * Ví dụ payload mẫu cho sự kiện payment.failed
 * @type {PaymentFailedPayload}
 */
const paymentFailedExample = {
  eventId: "evt_9f8e7d6c5b",
  type: "PaymentFailed",
  rideId: "ride_102938",
  userId: "cust_556677",
  amount: 55000,
  currency: "VND",
  reason: "Insufficient funds or Card expired",
  retryCount: 1,
  timestamp: "2026-02-28T16:45:05Z",
};

/**
 * Danh sách các trường bắt buộc của PaymentFailedPayload
 * Dùng để validate payload khi consume từ message broker
 */
const PAYMENT_FAILED_REQUIRED_FIELDS = [
  "eventId",
  "type",
  "rideId",
  "userId",
  "amount",
  "currency",
  "reason",
  "retryCount",
  "timestamp",
];

/** Số lần retry tối đa trước khi dừng hẳn */
const MAX_RETRY_COUNT = 3;

/**
 * Hàm validate payload của sự kiện payment.failed
 * @param {Object} payload - Dữ liệu nhận được từ message broker
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePaymentFailedPayload(payload) {
  const errors = [];

  // Kiểm tra các trường bắt buộc
  for (const field of PAYMENT_FAILED_REQUIRED_FIELDS) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Thiếu trường bắt buộc: "${field}"`);
    }
  }

  // Kiểm tra type đúng giá trị
  if (payload.type && payload.type !== "PaymentFailed") {
    errors.push(
      `Trường "type" không hợp lệ: nhận "${payload.type}", mong đợi "PaymentFailed"`,
    );
  }

  // Kiểm tra amount phải là số dương
  if (
    payload.amount !== undefined &&
    (typeof payload.amount !== "number" || payload.amount <= 0)
  ) {
    errors.push(`Trường "amount" phải là số lớn hơn 0`);
  }

  // Kiểm tra retryCount phải là số nguyên không âm
  if (
    payload.retryCount !== undefined &&
    (!Number.isInteger(payload.retryCount) || payload.retryCount < 0)
  ) {
    errors.push(`Trường "retryCount" phải là số nguyên không âm`);
  }

  // Cảnh báo nếu đã vượt quá số lần retry tối đa
  if (payload.retryCount > MAX_RETRY_COUNT) {
    errors.push(
      `Trường "retryCount" (${payload.retryCount}) đã vượt quá giới hạn tối đa (${MAX_RETRY_COUNT})`,
    );
  }

  // Kiểm tra reason không được rỗng
  if (
    payload.reason !== undefined &&
    typeof payload.reason === "string" &&
    payload.reason.trim() === ""
  ) {
    errors.push(`Trường "reason" không được để trống`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  paymentFailedExample,
  PAYMENT_FAILED_REQUIRED_FIELDS,
  MAX_RETRY_COUNT,
  validatePaymentFailedPayload,
};
