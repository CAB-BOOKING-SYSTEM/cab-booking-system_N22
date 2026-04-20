-- ============================================
-- USER SERVICE DATABASE SCHEMA
-- PostgreSQL
-- ============================================

-- Bảng users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  role VARCHAR(20) DEFAULT 'RIDER',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng saved_locations
CREATE TABLE IF NOT EXISTS saved_locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  label VARCHAR(50) NOT NULL,
  address TEXT NOT NULL,
  lat DECIMAL(10,8),
  lng DECIMAL(11,8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_locations_user_id ON saved_locations(user_id);

-- Insert dữ liệu mẫu (nếu cần)
INSERT INTO users (full_name, phone_number, email, role, status) VALUES
('Admin System', '0900000000', 'admin@cab.com', 'ADMIN', 'ACTIVE'),
('Driver Test', '0900000001', 'driver@cab.com', 'DRIVER', 'ACTIVE'),
('Customer Test', '0900000002', 'customer@cab.com', 'RIDER', 'ACTIVE')
ON CONFLICT (phone_number) DO NOTHING;