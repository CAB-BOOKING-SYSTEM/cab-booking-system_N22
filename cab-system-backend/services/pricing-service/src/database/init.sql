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