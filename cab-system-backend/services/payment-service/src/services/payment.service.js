const retry = require("../utils/retry");
const repo = require("../repositories/payment.repo");
const transactionRepo = require("../repositories/paymentTransaction.repo");
const messageBroker = require("../utils/messageBroker");

class PaymentService {

  // ================= CONSUMER =================
  async startConsumer() {
    await messageBroker.consume(
      "ride.completed",
      "ride.events",
      "ride.completed",
      async (event) => {

        const data = event.data;
        const rideId = data.rideId;

        console.log("🚗 ride.completed:", rideId);

        let payment = await repo.findByRideId(rideId);

        if (payment) {
          console.log("⚠️ Duplicate payment");
          return;
        }

        payment = await repo.create({
          rideId,
          bookingId: data.bookingId,
          userId: data.customerId || null,
          amount: data.finalPrice
        });

        await transactionRepo.create({
          payment_id: payment.id,
          provider: "VNPAY",
          amount: data.finalPrice,
          status: "PENDING"
        });

        console.log("✅ Payment created:", rideId);
      }
    );
  }

  // ================= RETURN + RETRY =================
  async handleVNPayReturn(params) {

    console.log("👉 RETURN:", params);

    const rideId = params.vnp_TxnRef;
    const code = params.vnp_ResponseCode;

    const payment = await repo.findByRideId(rideId);
    if (!payment) throw new Error("Payment not found");

    const transaction = await transactionRepo.findLatestByPaymentId(payment.id);

    // 🔥 phân loại lỗi
    const FAILED_CODES = ["51", "12", "10", "13", "24"];
    const RETRY_CODES = ["75", "99"];

    let attempt = 0;

    const process = async () => {
      attempt++;
      console.log(`👉 Attempt ${attempt}`);

      // ===== SUCCESS =====
      if (code === "00") {

        await repo.update(payment.id, "SUCCESS");

        await transactionRepo.update({
          id: transaction.id,
          status: "SUCCESS",
          provider_txn_id: params.vnp_TransactionNo || "manual",
          error_code: null
        });

        await messageBroker.publish("payment.events", "payment.completed", {
          data: {
            rideId,
            paymentId: payment.id,
            amount: payment.amount
          }
        });

        console.log("✅ SUCCESS:", rideId);
        return;
      }

      // ===== RETRY =====
      if (RETRY_CODES.includes(code)) {

        console.log("🔁 RETRY CASE");

        // 🔥 test timeout (2 fail → 1 success)
        if (params.test === "timeout") {
          if (attempt < 3) {
            throw new Error("timeout");
          }

          console.log("✅ SUCCESS AFTER RETRY");

          await repo.update(payment.id, "SUCCESS");

          await transactionRepo.update({
            id: transaction.id,
            status: "SUCCESS",
            provider_txn_id: "retry_success",
            error_code: null
          });

          await messageBroker.publish("payment.events", "payment.completed", {
            data: { rideId }
          });

          return;
        }

        throw new Error("SYSTEM_ERROR");
      }

      // ===== FAILED =====
      if (FAILED_CODES.includes(code)) {
        throw {
          type: "BUSINESS",
          code
        };
      }

      throw {
        type: "UNKNOWN",
        code
      };
    };

    try {
      await retry(process, 3);
      return { success: true };

    } catch (err) {

      await repo.update(payment.id, "FAILED");

      await transactionRepo.update({
        id: transaction.id,
        status: "FAILED",
        provider_txn_id: null,
        error_code: err.code || "SYSTEM_ERROR"
      });

      await messageBroker.publish("payment.events", "payment.failed", {
        data: { rideId }
      });

      console.log("❌ FAILED:", rideId);

      return { success: false };
    }
  }

  
}

module.exports = new PaymentService();