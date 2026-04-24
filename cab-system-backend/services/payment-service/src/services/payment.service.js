const repo = require("../repositories/payment.repo");
const transactionRepo = require("../repositories/paymentTransaction.repo");
const messageBroker = require("../utils/messageBroker");

class PaymentService {
  async startConsumer() {
    // ================= BOOKING CREATED =================
    await messageBroker.consume(
      "booking.created",
      "booking.events",
      "booking.created",
      async (event) => {
        const data = event.data;
        const bookingId = data.bookingId;

        console.log("📦 booking.created:", bookingId);

        if (data.paymentMethod === "cash") {
          console.log("💵 CASH → skip");
          return;
        }

        const existing = await repo.findByBookingId(bookingId);
        if (existing) return;

        const payment = await repo.create({
          bookingId,
          userId: data.customerId,
          amount: data.estimatedPrice.total,
          currency: data.estimatedPrice.currency,
          eventId: event.eventId,
        });

        await transactionRepo.create({
          payment_id: payment.id,
          provider: "VNPAY",
          amount: payment.amount,
          status: "PENDING",
        });

        console.log("✅ Payment created:", bookingId);
      }
    );

    // ❗ DEBUG QUEUE (KHÔNG CONSUME → để xem trên UI)
    const ch = await require("../utils/messageBroker").connect().then(() => require("../utils/messageBroker"));

    // bạn có thể tạo queue debug thủ công nếu muốn
    console.log("🪵 Debug queues ready (no consumer)");
  }

  // ================= HANDLE VNPAY =================
  async handleVNPayReturn(params) {
    const bookingId = params.vnp_TxnRef;
    const code = params.vnp_ResponseCode;

    const payment = await repo.findByBookingId(bookingId);
    if (!payment) throw new Error("Payment not found");

    const transaction = await transactionRepo.findLatestByPaymentId(
      payment.id
    );

    // ✅ SUCCESS
    if (code === "00") {
      await repo.update(payment.id, "SUCCESS");

      await transactionRepo.update({
        id: transaction.id,
        status: "SUCCESS",
        provider_txn_id: params.vnp_TransactionNo,
        error_code: null,
      });

      console.log("💰 Payment SUCCESS:", bookingId);

      // 🔥 publish event
      await messageBroker.publish("payment.events", "payment.completed", {
        data: {
          bookingId,
          paymentId: payment.id,
        },
      });

      return { success: true };
    }

    // ❌ FAILED
    await repo.update(payment.id, "FAILED");

    await transactionRepo.update({
      id: transaction.id,
      status: "FAILED",
      provider_txn_id: null,
      error_code: code,
    });

    console.log("💥 Payment FAILED:", bookingId);

    await messageBroker.publish("payment.events", "payment.failed", {
      data: { bookingId },
    });

    return { success: false };
  }
}

module.exports = new PaymentService();