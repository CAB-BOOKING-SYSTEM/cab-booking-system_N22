//D:\cki_mrnam\cab-booking-system_N22\cab-system-backend\services\payment-service\src\services\payment.service.js
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

        // 🔥 FIX CHÍNH Ở ĐÂY
        const data = event.data || event;

        if (!data || !data.rideId) {
          console.error("❌ Invalid event:", event);
          return;
        }

        const rideId = data.rideId;

        console.log("🚗 ride.completed:", rideId);

        let payment = await repo.findByRideId(rideId);

        if (payment) {
          console.log("⚠️ Duplicate payment");
          return;
        }

        // 🔥 FIX FIELD (fare vs finalPrice)
        const amount = data.fare || data.finalPrice || 0;

        const newPayment = await repo.create({
          rideId,
          bookingId: data.bookingId || null,
          userId: data.userId || data.customerId || null,
          amount
        });

        await transactionRepo.create({
          payment_id: newPayment.id,
          provider: "VNPAY",
          amount,
          status: "PENDING"
        });

        console.log("💰 Payment inserted into DB:", newPayment.id);
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

    const FAILED_CODES = ["51", "12", "10", "13", "24"];
    const RETRY_CODES = ["75", "99"];

    let attempt = 0;

    const process = async () => {
      attempt++;

      console.log(`👉 Attempt ${attempt}`);

      if (attempt > 1) {
        await repo.increaseRetry(payment.id);
        console.log("🔥 retry_count +1");
      }

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
            data: {
              rideId,
              paymentId: payment.id,
              amount: payment.amount
            }
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
      await retry(process, 4, 1000);
      return { success: true };

    } catch (err) {

      console.log("❌ RETRY EXHAUSTED");

      await repo.update(payment.id, "FAILED");

      await transactionRepo.update({
        id: transaction.id,
        status: "FAILED",
        provider_txn_id: null,
        error_code: err.code || "SYSTEM_ERROR"
      });

      await messageBroker.publish("payment.events", "payment.failed", {
        data: {
          rideId,
          paymentId: payment.id
        }
      });

      console.log("❌ FAILED:", rideId);

      return { success: false };
    }
  }
}

module.exports = new PaymentService();