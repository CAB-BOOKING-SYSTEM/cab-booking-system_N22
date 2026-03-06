SET client_encoding = 'UTF8';
CREATE TABLE IF NOT EXISTS payments (
    id             SERIAL PRIMARY KEY,
    ride_id        INTEGER,
    user_id        INTEGER,
    amount         NUMERIC,
    status         VARCHAR(50) DEFAULT 'PENDING',  -- PENDING | SUCCESS | FAILED | UNPAID
    retry_count    INTEGER DEFAULT 0,
    provider       VARCHAR(50),        -- "stripe" | "vnpay"
    transaction_id VARCHAR(255),       -- ID trả về từ Stripe / VNPay
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);