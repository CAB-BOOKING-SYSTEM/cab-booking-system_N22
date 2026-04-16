-- Bảng pricing
CREATE TABLE IF NOT EXISTS pricings (
  id SERIAL PRIMARY KEY,
  vehicle_type VARCHAR(50) NOT NULL UNIQUE,
  base_fare DECIMAL(10,2) NOT NULL,
  per_km_rate DECIMAL(10,2) NOT NULL,
  per_minute_rate DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng surge pricing
CREATE TABLE IF NOT EXISTS surges (
  id SERIAL PRIMARY KEY,
  zone VARCHAR(100) NOT NULL UNIQUE,
  multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng promotions
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
  value DECIMAL(10,2) NOT NULL,
  min_trip_value DECIMAL(10,2) DEFAULT 0,
  max_discount DECIMAL(10,2),
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP NOT NULL,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  applicable_vehicle_types TEXT[],
  applicable_zones TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng historical estimates
CREATE TABLE IF NOT EXISTS historical_estimates (
  id SERIAL PRIMARY KEY,
  request_id VARCHAR(100) NOT NULL,
  vehicle_type VARCHAR(50) NOT NULL,
  distance DECIMAL(10,2) NOT NULL,
  duration INTEGER NOT NULL,
  zone VARCHAR(100) NOT NULL,
  base_fare DECIMAL(10,2) NOT NULL,
  per_km_rate DECIMAL(10,2) NOT NULL,
  per_minute_rate DECIMAL(10,2) NOT NULL,
  surge_multiplier DECIMAL(5,2) DEFAULT 1.0,
  estimated_fare DECIMAL(10,2) NOT NULL,
  promotion_code VARCHAR(50),
  final_fare DECIMAL(10,2),
  user_id VARCHAR(100),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tạo indexes
CREATE INDEX idx_promotions_code ON promotions(code);
CREATE INDEX idx_promotions_active ON promotions(is_active, valid_from, valid_to);
CREATE INDEX idx_historical_timestamp ON historical_estimates(timestamp);
CREATE INDEX idx_historical_zone ON historical_estimates(zone);
CREATE INDEX idx_historical_user ON historical_estimates(user_id);

-- Insert dữ liệu mẫu
INSERT INTO pricings (vehicle_type, base_fare, per_km_rate, per_minute_rate) VALUES
('car', 10000, 5000, 1000),
('suv', 15000, 7000, 1200),
('bike', 5000, 3000, 500)
ON CONFLICT (vehicle_type) DO NOTHING;

INSERT INTO surges (zone, multiplier) VALUES
('CENTER', 1.5),
('AIRPORT', 2.0),
('SUBURB', 1.0)
ON CONFLICT (zone) DO NOTHING;

INSERT INTO promotions (code, type, value, min_trip_value, max_discount, valid_from, valid_to, usage_limit, applicable_vehicle_types, applicable_zones) VALUES
('WELCOME50', 'fixed', 50000, 100000, NULL, '2025-01-01', '2026-12-31', 1000, ARRAY['car', 'suv'], ARRAY['CENTER', 'AIRPORT']),
('SAVE20', 'percentage', 20, 50000, 30000, '2025-01-01', '2026-12-31', 500, ARRAY['car', 'suv', 'bike'], ARRAY['CENTER', 'SUBURB'])
ON CONFLICT (code) DO NOTHING;