//D:\bc_cki_new3\cab-booking-system_N22\cab-system-backend\services\payment-service\src\models\payment.model.js
const PaymentStatus = {
  PENDING: "PENDING",
  SUCCESS: "SUCCESS",
  FAILED:  "FAILED",
};

const PaymentMethod = {
  CASH:   "cash",
  CARD:   "card",
  WALLET: "wallet",
};

class Payment {
  constructor({
    bookingId,
    userId,
    driverId      = null,
    amount,
    driverAmount  = 0,
    currency      = "VND",
    status        = PaymentStatus.PENDING,
    paymentMethod = PaymentMethod.CARD,
    eventId,
    idempotencyKey,
  }) {
    this.bookingId      = bookingId;
    this.userId         = userId;
    this.driverId       = driverId;
    this.amount         = amount;
    this.driverAmount   = driverAmount;
    this.currency       = currency;
    this.status         = status;
    this.paymentMethod  = paymentMethod;
    this.eventId        = eventId;
    this.idempotencyKey = idempotencyKey;
  }

  isPending() {
    return this.status === PaymentStatus.PENDING;
  }

  isCompleted() {
    return this.status === PaymentStatus.SUCCESS;
  }
}

module.exports = { Payment, PaymentStatus, PaymentMethod };