const qs = require("qs");
const crypto = require("crypto");

class VNPayProvider {
  createPaymentUrl(payment) {
    const tmnCode = process.env.VNPAY_TMN_CODE;
    const secret = process.env.VNPAY_HASH_SECRET;
    const vnpUrl = process.env.VNPAY_URL;
    const returnUrl = process.env.VNPAY_RETURN_URL;

    const date = new Date();
    const pad = (n) => n.toString().padStart(2, "0");
    const createDate =
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds());

    const params = {
      vnp_Version: "2.1.0",
      vnp_Command: "pay",
      vnp_TmnCode: tmnCode,
      vnp_Amount: Math.round(payment.amount * 100),
      vnp_CurrCode: "VND",
      vnp_TxnRef: payment.ride_id,
      vnp_OrderInfo: `Ride payment for ride ${payment.ride_id}`,
      vnp_OrderType: "billpayment",
      vnp_Locale: "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: "127.0.0.1",
      vnp_CreateDate: createDate,
    };

    // Sort params theo alphabet trước khi ký
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const signData = qs.stringify(sortedParams, { encode: false });
    const signed = crypto
      .createHmac("sha512", secret)
      .update(signData)
      .digest("hex");

    sortedParams.vnp_SecureHash = signed;

    return `${vnpUrl}?${qs.stringify(sortedParams, { encode: false })}`;
  }

  verifyReturn(query) {
    const secret = process.env.VNPAY_HASH_SECRET;
    const { vnp_SecureHash, ...params } = query;

    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        acc[key] = params[key];
        return acc;
      }, {});

    const signData = qs.stringify(sortedParams, { encode: false });
    const expectedHash = crypto
      .createHmac("sha512", secret)
      .update(signData)
      .digest("hex");

    return {
      isValid: expectedHash === vnp_SecureHash,
      isSuccess: params.vnp_ResponseCode === "00",
      rideId: params.vnp_TxnRef,
      transactionId: params.vnp_TransactionNo,
    };
  }
}

module.exports = new VNPayProvider();