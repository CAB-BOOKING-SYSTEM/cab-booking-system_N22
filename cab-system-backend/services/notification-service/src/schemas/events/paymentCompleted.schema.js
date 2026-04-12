/**
 * @file paymentCompleted.schema.js
 * @description Schema định nghĩa cấu trúc payload cho event: payment.completed
 * @topic payment.completed
 * @producer Payment Service
 * @consumer Notification Service
 *
 * Sự kiện được bắn ra sau khi Payment Service charge tiền thành công.
 * Dùng để gửi thông báo xác nhận thanh toán cho cả khách hàng lẫn tài xế.
 */

/**
 * @typedef {'customer' | 'driver'} UserRole
 */

/**
 * @typedef {'CreditCard' | 'DebitCard' | 'Cash' | 'Wallet' | 'MoMo' | 'ZaloPay'} PaymentMethod
 */

/**
 * @typedef {Object} PaymentCompletedPayload
 * @property {string}        eventId         - ID duy nhất của sự kiện (VD: "evt_1b2c3d4e5f")
 * @property {string}        type            - Loại sự kiện, luôn là "PaymentCompleted"
 * @property {string}        rideId          - ID của chuyến đi liên quan (VD: "ride_102938")
 * @property {string}        userId          - ID người dùng được thông báo (VD: "cust_556677")
 * @property {UserRole}      userRole        - Vai trò người dùng ("customer" hoặc "driver")
 * @property {PaymentMethod} paymentMethod   - Phương thức thanh toán đã dùng
 * @property {number}        amount          - Số tiền thanh toán (đơn vị theo currency)
 * @property {string}        currency        - Đơn vị tiền tệ (VD: "VND", "USD")
 * @property {string}        transactionId   - ID giao dịch từ cổng thanh toán (VD: "txn_abc123xyz")
 * @property {string}        timestamp       - Thời điểm sự kiện xảy ra (ISO 8601)
 */

/**
 * Ví dụ payload mẫu cho sự kiện payment.completed
 * @type {PaymentCompletedPayload}
 */
const paymentCompletedExample = {
  eventId: "evt_1b2c3d4e5f",
  type: "PaymentCompleted",
  rideId: "ride_102938",
  userId: "cust_556677",
  userRole: "customer",
  paymentMethod: "CreditCard",
  amount: 55000,
  currency: "VND",
  transactionId: "txn_abc123xyz",
  timestamp: "2026-02-28T16:45:00Z",
};

/**
 * Danh sách các trường bắt buộc của PaymentCompletedPayload
 * Dùng để validate payload khi consume từ message broker
 */
const PAYMENT_COMPLETED_REQUIRED_FIELDS = [
  "eventId",
  "type",
  "rideId",
  "userId",
  "userRole",
  "paymentMethod",
  "amount",
  "currency",
  "transactionId",
  "timestamp",
];

/** Các giá trị hợp lệ cho trường userRole */
const VALID_USER_ROLES = ["customer", "driver"];

/** Các phương thức thanh toán được hỗ trợ */
const VALID_PAYMENT_METHODS = [
  "CreditCard",
  "DebitCard",
  "Cash",
  "Wallet",
  "MoMo",
  "ZaloPay",
];

/**
 * Hàm validate payload của sự kiện payment.completed
 * @param {Object} payload - Dữ liệu nhận được từ message broker
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePaymentCompletedPayload(payload) {
  const errors = [];

  // Kiểm tra các trường bắt buộc
  for (const field of PAYMENT_COMPLETED_REQUIRED_FIELDS) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Thiếu trường bắt buộc: "${field}"`);
    }
  }

  // Kiểm tra type đúng giá trị
  if (payload.type && payload.type !== "PaymentCompleted") {
    errors.push(
      `Trường "type" không hợp lệ: nhận "${payload.type}", mong đợi "PaymentCompleted"`,
    );
  }

  // Kiểm tra userRole hợp lệ
  if (payload.userRole && !VALID_USER_ROLES.includes(payload.userRole)) {
    errors.push(
      `Trường "userRole" không hợp lệ: nhận "${
        payload.userRole
      }", chấp nhận ${VALID_USER_ROLES.join(" | ")}`,
    );
  }

  // Kiểm tra paymentMethod hợp lệ
  if (
    payload.paymentMethod &&
    !VALID_PAYMENT_METHODS.includes(payload.paymentMethod)
  ) {
    errors.push(
      `Trường "paymentMethod" không hợp lệ: "${payload.paymentMethod}"`,
    );
  }

  // Kiểm tra amount phải là số dương
  if (
    payload.amount !== undefined &&
    (typeof payload.amount !== "number" || payload.amount <= 0)
  ) {
    errors.push(`Trường "amount" phải là số lớn hơn 0`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  paymentCompletedExample,
  PAYMENT_COMPLETED_REQUIRED_FIELDS,
  VALID_USER_ROLES,
  VALID_PAYMENT_METHODS,
  validatePaymentCompletedPayload,
};
