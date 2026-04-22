const crypto = require("crypto");
const qs = require("qs");

const sortObject = (obj) => {
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = encodeURIComponent(obj[key]).replace(/%20/g, "+");
  });
  return sorted;
};

const createPaymentUrl = (payment) => {
  const date = new Date();

  const vnp_Params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: process.env.VNP_TMNCODE,
    vnp_Amount: payment.amount * 100,
    vnp_CurrCode: "VND",

    vnp_TxnRef: payment.ride_id, // 🔥 phải trùng DB

    vnp_OrderInfo: `Thanh toan ${payment.ride_id}`,
    vnp_OrderType: "other",
    vnp_Locale: "vn",

    vnp_ReturnUrl: process.env.VNP_RETURN_URL,

    vnp_IpAddr: "127.0.0.1",
    vnp_CreateDate: date.toISOString().replace(/[^0-9]/g, "").slice(0, 14),
  };

  const sorted = sortObject(vnp_Params);
  const signData = qs.stringify(sorted, { encode: false });

  const secureHash = crypto
    .createHmac("sha512", process.env.VNP_HASH_SECRET)
    .update(signData)
    .digest("hex");

  return `${process.env.VNP_URL}?${signData}&vnp_SecureHash=${secureHash}`;
};

module.exports = { createPaymentUrl };