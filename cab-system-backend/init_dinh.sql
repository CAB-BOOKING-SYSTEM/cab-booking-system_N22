\c payment_db

CREATE TABLE payments (
  id              SERIAL PRIMARY KEY,
  booking_id      VARCHAR(255) NOT NULL UNIQUE,
  user_id         VARCHAR(255) NOT NULL,
  driver_id       VARCHAR(255),
  amount          INTEGER NOT NULL,
  driver_amount   INTEGER NOT NULL DEFAULT 0,
  currency        VARCHAR(10) DEFAULT 'VND',
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'vnpay',
  status          VARCHAR(50) DEFAULT 'PENDING',
  event_id        VARCHAR(255),
  idempotency_key VARCHAR(255),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP
);

CREATE TABLE payment_transactions (
  id              SERIAL PRIMARY KEY,
  payment_id      INTEGER REFERENCES payments(id) ON DELETE CASCADE,
  provider        VARCHAR(50) NOT NULL,
  provider_txn_id VARCHAR(255),
  amount          INTEGER NOT NULL,
  status          VARCHAR(50),
  error_code      VARCHAR(50),
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE driver_wallets (
  id         SERIAL PRIMARY KEY,
  driver_id  VARCHAR(255) NOT NULL UNIQUE,
  balance    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE driver_wallet_transactions (
  id         SERIAL PRIMARY KEY,
  driver_id  VARCHAR(255) NOT NULL,
  booking_id VARCHAR(255),
  amount     INTEGER NOT NULL,
  type       VARCHAR(50) DEFAULT 'RIDE_INCOME',
  created_at TIMESTAMP DEFAULT NOW()
);