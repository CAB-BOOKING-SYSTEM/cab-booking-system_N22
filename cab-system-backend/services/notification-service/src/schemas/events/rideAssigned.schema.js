/**
 * @file rideAssigned.schema.js
 * @description Schema định nghĩa cấu trúc payload cho event: ride.assigned
 * @topic ride.assigned
 * @producer Matching Service
 * @consumer Notification Service
 *
 * Sự kiện được bắn ra khi Matching Service ghép cuốc thành công
 * và một tài xế đã được chỉ định cho chuyến đi.
 */

/**
 * @typedef {Object} DriverInfo
 * @property {string} name        - Tên đầy đủ của tài xế
 * @property {string} vehicle     - Loại xe (VD: "Honda Vios")
 * @property {string} plateNumber - Biển số xe (VD: "51G-123.45")
 * @property {number} rating      - Điểm đánh giá trung bình (0.0 - 5.0)
 */

/**
 * @typedef {Object} RideAssignedPayload
 * @property {string}     eventId    - ID duy nhất của sự kiện (VD: "evt_8a7b6c5d4e")
 * @property {string}     type       - Loại sự kiện, luôn là "RideAssigned"
 * @property {string}     rideId     - ID của chuyến đi (VD: "ride_102938")
 * @property {string}     customerId - ID khách hàng đặt cuốc (VD: "cust_556677")
 * @property {string}     driverId   - ID tài xế được chỉ định (VD: "drv_998877")
 * @property {DriverInfo} driverInfo - Thông tin chi tiết về tài xế và xe
 * @property {number}     etaMinutes - Thời gian dự kiến tài xế đến (đơn vị: phút)
 * @property {string}     timestamp  - Thời điểm sự kiện xảy ra (ISO 8601)
 */

/**
 * Ví dụ payload mẫu cho sự kiện ride.assigned
 * @type {RideAssignedPayload}
 */
const rideAssignedExample = {
  eventId: "evt_8a7b6c5d4e",
  type: "RideAssigned",
  rideId: "ride_102938",
  customerId: "cust_556677",
  driverId: "drv_998877",
  driverInfo: {
    name: "Nguyễn Văn A",
    vehicle: "Honda Vios",
    plateNumber: "51G-123.45",
    rating: 4.9,
  },
  etaMinutes: 5,
  timestamp: "2026-02-28T16:11:48Z",
};

/**
 * Danh sách các trường bắt buộc của RideAssignedPayload
 * Dùng để validate payload khi consume từ message broker
 */
const RIDE_ASSIGNED_REQUIRED_FIELDS = [
  "eventId",
  "type",
  "rideId",
  "customerId",
  "driverId",
  "driverInfo",
  "etaMinutes",
  "timestamp",
];

const DRIVER_INFO_REQUIRED_FIELDS = [
  "name",
  "vehicle",
  "plateNumber",
  "rating",
];

/**
 * Hàm validate payload của sự kiện ride.assigned
 * @param {Object} payload - Dữ liệu nhận được từ message broker
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validateRideAssignedPayload(payload) {
  const errors = [];

  // Kiểm tra các trường top-level bắt buộc
  for (const field of RIDE_ASSIGNED_REQUIRED_FIELDS) {
    if (payload[field] === undefined || payload[field] === null) {
      errors.push(`Thiếu trường bắt buộc: "${field}"`);
    }
  }

  // Kiểm tra type đúng giá trị
  if (payload.type && payload.type !== "RideAssigned") {
    errors.push(
      `Trường "type" không hợp lệ: nhận "${payload.type}", mong đợi "RideAssigned"`,
    );
  }

  // Kiểm tra các trường bên trong driverInfo
  if (payload.driverInfo && typeof payload.driverInfo === "object") {
    for (const field of DRIVER_INFO_REQUIRED_FIELDS) {
      if (
        payload.driverInfo[field] === undefined ||
        payload.driverInfo[field] === null
      ) {
        errors.push(`Thiếu trường bắt buộc trong driverInfo: "${field}"`);
      }
    }
  }

  // Kiểm tra etaMinutes phải là số dương
  if (
    payload.etaMinutes !== undefined &&
    (typeof payload.etaMinutes !== "number" || payload.etaMinutes < 0)
  ) {
    errors.push(`Trường "etaMinutes" phải là số nguyên không âm`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

module.exports = {
  rideAssignedExample,
  RIDE_ASSIGNED_REQUIRED_FIELDS,
  DRIVER_INFO_REQUIRED_FIELDS,
  validateRideAssignedPayload,
};
