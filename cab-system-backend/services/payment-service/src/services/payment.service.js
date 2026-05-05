//D:\bc_cki_new3\cab-booking-system_N22\cab-system-backend\services\payment-service\src\services\payment.service.js
const repo           = require("../repositories/payment.repo");
const transactionRepo= require("../repositories/paymentTransaction.repo");
const walletRepo     = require("../repositories/driverWallet.repo");
const messageBroker  = require("../utils/messageBroker");

const DRIVER_SERVICE_URL = process.env.DRIVER_SERVICE_URL || "http://cab_driver:3003";

class PaymentService {
  async startConsumer() {

    // ===== 1. booking.created → tạo PENDING record =====
    await messageBroker.consume(
      "booking.created",
      "booking.events",
      "booking.created",
      async (event) => {
        const data      = event.data;
        const bookingId = data.bookingId;

        // Cash → bỏ qua
        if (data.paymentMethod === "cash") {
          console.log("💵 Cash booking → skip:", bookingId);
          return;
        }

        // Idempotency
        const existing = await repo.findByBookingId(bookingId);
        if (existing) {
          console.log("⚠️ Payment already exists:", bookingId);
          return;
        }

        const totalAmount  = data.estimatedPrice?.total || data.amount;
        const driverAmount = totalAmount; // Cuốc xe được nhiêu driver được bấy nhiêu

        const payment = await repo.create({
          bookingId,
          userId:        data.customerId,
          driverId:      null,
          amount:        totalAmount,
          driverAmount,
          currency:      data.estimatedPrice?.currency || "VND",
          paymentMethod: data.paymentMethod,
          status:        "PENDING",
          eventId:       event.eventId,
        });

        console.log(`✅ Payment PENDING created: ${bookingId}`);

        // Publish payment.created (cho notification service)
        await messageBroker.publish("payment.events", "payment.created", {
          eventId: `pmt-${Date.now()}`,
          data: {
            paymentId:     payment.id,
            bookingId,
            userId:        data.customerId,
            amount:        totalAmount,
            driverAmount,
            currency:      data.estimatedPrice?.currency || "VND",
            paymentMethod: data.paymentMethod,
            status:        "PENDING",
            createdAt:     new Date().toISOString(),
          }
        });
      }
    );

    // ===== 2. ride.completed → gán driverId + tạo transaction =====
    await messageBroker.consume(
      "ride.completed",
      "ride.events",
      "ride.completed",
      async (event) => {
        const { bookingId, driverId } = event.data;

        const payment = await repo.findByBookingId(bookingId);
        if (!payment) {
          console.log("💵 No payment record (cash):", bookingId);
          return;
        }

        if (!driverId) {
          console.log("⚠️ Missing driverId:", bookingId);
          return;
        }

        if (payment.status !== "PENDING") {
          console.log("⚠️ Already processed:", bookingId, payment.status);
          return;
        }

        await repo.updateDriver(bookingId, driverId);

        await transactionRepo.create({
          paymentId: payment.id,
          provider:  "VNPAY",
          amount:    payment.amount,
          status:    "PENDING",
        });

        console.log(`✅ ride.completed: ${bookingId} | driver: ${driverId}`);
      }
    );

    console.log("✅ All consumers started");
  }

  // ===== 3. VNPay callback =====
  async handleVNPayReturn(params) {
    const bookingId = params.vnp_TxnRef;
    const code      = params.vnp_ResponseCode;

    const payment = await repo.findByBookingId(bookingId);
    if (!payment) throw new Error("Payment not found: " + bookingId);

    const transaction = await transactionRepo.findLatestByPaymentId(payment.id);
    if (!transaction) throw new Error("Transaction not found: " + payment.id);

    if (code === "00") {
      await repo.updateStatus(payment.id, "SUCCESS");
      await transactionRepo.markSuccess(transaction.id, params.vnp_TransactionNo);

      // Cộng ví PostgreSQL (payment service tự quản lý)
      await walletRepo.credit(
        payment.driver_id,
        payment.driver_amount,
        bookingId
      );

      // TODO: driver-service chưa có API /api/drivers/wallet/credit
      // Tạm thời comment lại để tránh lỗi 404 làm fail giao dịch
      // try {
      //   ...
      // } catch (err) {
      //   ...
      // }

      // PaymentSagaCompleted
      await messageBroker.publish("payment.events", "payment.completed", {
        eventId: `pmt-${Date.now()}`,
        data: {
          bookingId,
          paymentId:    payment.id,
          driverId:     payment.driver_id,
          amount:       payment.amount,
          driverAmount: payment.driver_amount,
          currency:     payment.currency || "VND",
          completedAt:  new Date().toISOString(),
        },
      });

      console.log("✅ PaymentSagaCompleted:", bookingId);
      return { success: true };
    }

    // FAILED
    await repo.updateStatus(payment.id, "FAILED");
    await transactionRepo.markFailed(transaction.id, code);

    await messageBroker.publish("payment.events", "payment.failed", {
      eventId: `pmt-${Date.now()}`,
      data: {
        bookingId,
        errorCode: code,
        reason:    "vnpay_charge_failed"
      },
    });

    console.log("💥 Payment FAILED:", bookingId);
    return { success: false };
  }
}

module.exports = new PaymentService();