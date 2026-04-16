-- 🔥 PAYMENTS (core)
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,

  ride_id VARCHAR(255) NOT NULL,
  booking_id VARCHAR(255),

  user_id VARCHAR(255),                -- có thể null (payload chưa có)
  
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'VND',  -- 🔥 thêm

  status VARCHAR(50) DEFAULT 'PENDING',

  retry_count INTEGER DEFAULT 0,
  idempotency_key VARCHAR(255),

  event_id VARCHAR(255),               -- 🔥 trace event (quan trọng khi debug)

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- 🔥 PAYMENT TRANSACTIONS (gateway level)
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,

  payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL,       -- VNPAY / STRIPE
  provider_txn_id VARCHAR(255),

  amount INTEGER NOT NULL,

  status VARCHAR(50),                  -- PENDING / SUCCESS / FAILED
  error_code VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW()
);

-- 🔥 AUDIT LOGS (log event / debug / tracking)
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,

  action VARCHAR(255),                 -- PAYMENT_SUCCESS / FAILED
  data JSONB,                          -- lưu nguyên event

  created_at TIMESTAMP DEFAULT NOW()
);