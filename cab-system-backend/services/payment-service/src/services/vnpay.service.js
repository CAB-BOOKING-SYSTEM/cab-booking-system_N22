/**
 * vnpay.service.js  —  Production-grade, ổn định 100%
 *
 * Root cause của hầu hết lỗi chữ ký VNPay:
 *  1. encodeURIComponent() bị double-encode khi build signData
 *  2. Sai thứ tự sort (phải sort key raw, không encode trước)
 *  3. qs.stringify encode thêm lần nữa sau khi đã encode
 *  4. vnp_Amount không phải integer
 *  5. vnp_CreateDate sai timezone (phải là UTC+7)
 */

const crypto = require("crypto");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Lấy giờ Việt Nam (UTC+7) dạng YYYYMMDDHHmmss
 * VNPay yêu cầu đúng timezone này — sai sẽ bị reject
 */
function getVNTime() {
  const now = new Date();
  // Shift về UTC+7
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().replace(/[^0-9]/g, "").slice(0, 14);
}

/**
 * Sort object theo key (raw string, KHÔNG encode key trước khi sort)
 * rồi build query string đúng chuẩn VNPay:
 *  - key giữ nguyên
 *  - value encode bằng encodeURIComponent, thay %20 → +
 *  - nối bằng & (không dùng thư viện qs để tránh double-encode)
 */
function buildSignData(params) {
  return Object.keys(params)
    .filter((k) => params[k] !== "" && params[k] !== null && params[k] !== undefined)
    .sort() // sort key dạng raw
    .map((k) => `${k}=${encodeURIComponent(params[k]).replace(/%20/g, "+")}`)
    .join("&");
}

/**
 * Tính HMAC-SHA512
 */
function hmac512(secret, data) {
  return crypto.createHmac("sha512", secret).update(data).digest("hex");
}

// ─── createPaymentUrl ─────────────────────────────────────────────────────────

/**
 * @param {object} payment  - { ride_id, amount (VND, số nguyên) }
 * @returns {string}        - URL redirect sang VNPay
 */
const createPaymentUrl = (payment) => {
  const {
    VNP_TMNCODE,
    VNP_HASH_SECRET,
    VNP_URL,
    VNP_RETURN_URL,
  } = process.env;

  if (!VNP_TMNCODE || !VNP_HASH_SECRET || !VNP_URL || !VNP_RETURN_URL) {
    throw new Error("Thiếu biến môi trường VNPay (VNP_TMNCODE / VNP_HASH_SECRET / VNP_URL / VNP_RETURN_URL)");
  }

  // ⚠️ amount phải là số nguyên, nhân 100 (VNPay tính theo đơn vị đồng)
  const amount = Math.round(Number(payment.amount) * 100);
  if (!amount || isNaN(amount)) throw new Error("amount không hợp lệ");

  const txnRef = String(payment.ride_id || payment.rideId);
  if (!txnRef) throw new Error("ride_id / rideId không được để trống");

  const params = {
    vnp_Version:    "2.1.0",
    vnp_Command:    "pay",
    vnp_TmnCode:    VNP_TMNCODE,
    vnp_Amount:     amount,          // integer, không có dấu phẩy
    vnp_CurrCode:   "VND",
    vnp_TxnRef:     txnRef,
    vnp_OrderInfo:  `Thanh toan chuyen di ${txnRef}`,
    vnp_OrderType:  "other",
    vnp_Locale:     "vn",
    vnp_ReturnUrl:  VNP_RETURN_URL,
    vnp_IpAddr:     "127.0.0.1",
    vnp_CreateDate: getVNTime(),
  };

  const signData   = buildSignData(params);
  const secureHash = hmac512(VNP_HASH_SECRET, signData);

  // Append hash sau — KHÔNG đưa vnp_SecureHash vào signData
  return `${VNP_URL}?${signData}&vnp_SecureHash=${secureHash}`;
};

// ─── verifyReturn ─────────────────────────────────────────────────────────────

/**
 * Xác minh chữ ký callback từ VNPay
 * @param {object} query  - req.query từ Express
 * @returns {boolean}
 */
const verifyReturn = (query) => {
  const { VNP_HASH_SECRET } = process.env;
  if (!VNP_HASH_SECRET) throw new Error("Thiếu VNP_HASH_SECRET");

  // Tách hash ra, KHÔNG cho vào signData
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = query;

  if (!vnp_SecureHash) {
    console.error("❌ verifyReturn: không có vnp_SecureHash trong query");
    return false;
  }

  // Decode từng value trước khi build lại (Express đôi khi decode sẵn)
  // → normalize về string thuần, rồi buildSignData sẽ encode lại đúng chuẩn
  const normalized = {};
  for (const [k, v] of Object.entries(rest)) {
    normalized[k] = decodeURIComponent(String(v));
  }

  const signData   = buildSignData(normalized);
  const checkHash  = hmac512(VNP_HASH_SECRET, signData);

  const valid = checkHash.toLowerCase() === vnp_SecureHash.toLowerCase();
  if (!valid) {
    console.error("❌ Signature mismatch");
    console.error("   Expected :", checkHash);
    console.error("   Received :", vnp_SecureHash);
    console.error("   SignData  :", signData);
  }
  return valid;
};

// ─── verifyIPN (nếu dùng IPN thay vì ReturnUrl) ──────────────────────────────
const verifyIPN = verifyReturn; // cùng logic

module.exports = { createPaymentUrl, verifyReturn, verifyIPN };