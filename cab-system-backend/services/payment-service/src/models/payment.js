class Payment {
  constructor({ id, ride_id, user_id, amount, status, retry_count, provider, transaction_id, created_at, updated_at }) {
    this.id = id;
    this.ride_id = ride_id;
    this.user_id = user_id;
    this.amount = amount;
    this.status = status || "PENDING";
    this.retry_count = retry_count || 0;
    this.provider = provider || null;
    this.transaction_id = transaction_id || null;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }

  markSuccess(transactionId) {
    this.status = "SUCCESS";
    this.transaction_id = transactionId;
  }

  markFailed() {
    this.status = "FAILED";
  }

  markUnpaid() {
    this.status = "UNPAID";
  }

  incrementRetry() {
    this.retry_count += 1;
  }

  canRetry(maxRetries = 3) {
    return this.retry_count < maxRetries;
  }
}

module.exports = Payment;