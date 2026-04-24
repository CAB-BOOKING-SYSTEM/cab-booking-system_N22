-- 🔥 PAYMENTS
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,

  booking_id VARCHAR(255) NOT NULL UNIQUE,
  user_id VARCHAR(255),

  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'VND',

  status VARCHAR(50) DEFAULT 'PENDING',

  idempotency_key VARCHAR(255),
  event_id VARCHAR(255),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- 🔥 PAYMENT TRANSACTIONS
CREATE TABLE payment_transactions (
  id SERIAL PRIMARY KEY,

  payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,

  provider VARCHAR(50) NOT NULL,
  provider_txn_id VARCHAR(255),

  amount INTEGER NOT NULL,

  status VARCHAR(50),
  error_code VARCHAR(50),

  created_at TIMESTAMP DEFAULT NOW()
);

-- 🔥 IDEMPOTENCY
CREATE TABLE idempotency_keys (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE,
  response JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);