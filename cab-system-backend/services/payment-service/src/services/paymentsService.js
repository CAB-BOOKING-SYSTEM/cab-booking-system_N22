const messageBroker = require("../utils/messageBroker");
const paymentsRepository = require("../repositories/paymentsRepository");
const stripeProvider = require("../providers/stripeProvider");
const vnpayProvider = require("../providers/vnpayProvider");

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000; // 2s backoff base

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class PaymentService {
  // ─────────────────────────────────────────────────────────────
  // CONSUMER: Lắng nghe event "ride.finished" từ Ride Service
  // Theo diagram 3 & 4: RideFinished → StartPaymentSaga
  // ─────────────────────────────────────────────────────────────
  async startConsumer() {
    await messageBroker.consume("ride.finished", async (data, msg) => {
      console.log("[Consumer] ride.finished received:", data);

      const { rideId, userId, amount, paymentMethod } = data;

      try {
        // Tạo payment record với status PENDING
        const payment = await paymentsRepository.create({
          ride_id: rideId,
          user_id: userId,
          amount,
          provider: paymentMethod,
        });

        // Thực hiện charge với retry
        await this._chargeWithRetry(payment, paymentMethod);

        messageBroker.ack(msg);
      } catch (error) {
        console.error("[Consumer] Unhandled error:", error.message);
        messageBroker.nack(msg, false); // không requeue để tránh loop vô hạn
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // CORE: Charge với retry + backoff (Diagram 3)
  // ─────────────────────────────────────────────────────────────
  async _chargeWithRetry(payment, paymentMethod) {
    let lastError;

    while (payment.canRetry(MAX_RETRIES)) {
      try {
        // Thực hiện charge tuỳ provider
        let result;
        if (paymentMethod === "stripe") {
          result = await stripeProvider.charge(payment.amount);
        } else if (paymentMethod === "vnpay") {
          // VNPay server-to-server charge (mock trong test)
          result = { id: `vnpay_${Date.now()}`, status: "success" };
        } else {
          throw new Error(`Unknown payment method: ${paymentMethod}`);
        }

        // ── Charge thành công ──
        payment.markSuccess(result.id);
        await paymentsRepository.update(payment);

        // Publish PaymentCompleted → Ride Service cập nhật = PAID
        await messageBroker.publish("payment.completed", {
          rideId: payment.ride_id,
          paymentId: payment.id,
          transactionId: result.id,
        });

        // Publish PaymentSagaCompleted → Wallet/Ledger Service credit driver
        await messageBroker.publish("payment.saga.completed", {
          rideId: payment.ride_id,
          userId: payment.user_id,
          amount: payment.amount,
        });

        console.log(`[PaymentService] Payment success for ride ${payment.ride_id}`);
        return;

      } catch (error) {
        lastError = error;
        payment.incrementRetry();
        await paymentsRepository.update(payment);

        console.warn(
          `[PaymentService] Charge failed (attempt ${payment.retry_count}/${MAX_RETRIES}):`,
          error.message
        );

        // Publish PaymentFailed event sau mỗi lần fail
        await messageBroker.publish("payment.failed", {
          rideId: payment.ride_id,
          attempt: payment.retry_count,
          reason: error.message,
        });

        if (payment.canRetry(MAX_RETRIES)) {
          // Exponential backoff: 2s, 4s, 8s...
          const delay = RETRY_DELAY_MS * Math.pow(2, payment.retry_count - 1);
          console.log(`[PaymentService] Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    // ── Retry exhausted ──
    payment.markUnpaid();
    await paymentsRepository.update(payment);

    // Publish PaymentRetryExhausted → Ride Service đánh dấu = UNPAID
    await messageBroker.publish("payment.retry.exhausted", {
      rideId: payment.ride_id,
      paymentId: payment.id,
      reason: lastError?.message,
    });

    // Publish PaymentSagaFailed → trigger compensate nếu cần
    await messageBroker.publish("payment.saga.failed", {
      rideId: payment.ride_id,
      userId: payment.user_id,
      amount: payment.amount,
    });

    console.error(
      `[PaymentService] All retries exhausted for ride ${payment.ride_id}`
    );
  }

  // ─────────────────────────────────────────────────────────────
  // REST API: Tạo payment URL (Stripe Checkout / VNPay redirect)
  // ─────────────────────────────────────────────────────────────
  async getPaymentUrl(rideId, method) {
    const payment = await paymentsRepository.findByRideId(rideId);
    if (!payment) throw new Error(`Payment not found for ride ${rideId}`);

    if (method === "stripe") {
      const { url } = await stripeProvider.createCheckoutSession(payment);
      return url;
    }

    if (method === "vnpay") {
      return vnpayProvider.createPaymentUrl(payment);
    }

    throw new Error(`Unsupported payment method: ${method}`);
  }

  // ─────────────────────────────────────────────────────────────
  // REST API: Xử lý VNPay return callback
  // ─────────────────────────────────────────────────────────────
  async handleVNPayReturn(query) {
    const { isValid, isSuccess, rideId, transactionId } = vnpayProvider.verifyReturn(query);

    if (!isValid) throw new Error("Invalid VNPay signature");

    const payment = await paymentsRepository.findByRideId(rideId);
    if (!payment) throw new Error(`Payment not found for ride ${rideId}`);

    if (isSuccess) {
      payment.markSuccess(transactionId);
      await paymentsRepository.update(payment);

      await messageBroker.publish("payment.completed", {
        rideId,
        paymentId: payment.id,
        transactionId,
      });

      return { success: true };
    } else {
      payment.markFailed();
      await paymentsRepository.update(payment);

      await messageBroker.publish("payment.failed", {
        rideId,
        reason: "VNPay returned failure",
      });

      return { success: false };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // REST API: Lấy thông tin payment theo rideId
  // ─────────────────────────────────────────────────────────────
  async getPayment(rideId) {
    const payment = await paymentsRepository.findByRideId(rideId);
    if (!payment) throw new Error(`Payment not found for ride ${rideId}`);
    return payment;
  }
}

module.exports = PaymentService;