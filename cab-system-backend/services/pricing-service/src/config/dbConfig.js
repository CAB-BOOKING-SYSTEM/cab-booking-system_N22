const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DB_URL = process.env.DB_URL || 'postgresql://admin:password123@postgres:5432/pricing_db';

// Hàm tự động tạo database nếu chưa có
const ensureDatabase = async () => {
  // Parse URL để lấy tên database
  const match = DB_URL.match(/\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)$/);
  if (!match) {
    console.log('⚠️ Could not parse DB_URL, skipping database creation');
    return;
  }
  
  const [, user, password, host, port, dbName] = match;
  
  // Kết nối đến database mặc định 'postgres'
  const defaultPool = new Pool({
    host, port, user, password,
    database: 'postgres',
    connectionTimeoutMillis: 2000,
  });
  
  try {
    const res = await defaultPool.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if (res.rowCount === 0) {
      await defaultPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created successfully`);
    } else {
      console.log(`✅ Database ${dbName} already exists`);
    }
  } catch (err) {
    console.log('⚠️ Database creation warning:', err.message);
  } finally {
    await defaultPool.end();
  }
};

// Tạo pool kết nối chính
const pool = new Pool({
  connectionString: DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Hàm tự động tạo bảng (giống Driver Service)
const initTables = async () => {
  const client = await pool.connect();
  try {
    // Tạo bảng pricings
    await client.query(`
      CREATE TABLE IF NOT EXISTS pricings (
        id SERIAL PRIMARY KEY,
        vehicle_type VARCHAR(50) NOT NULL UNIQUE,
        base_fare DECIMAL(10,2) NOT NULL,
        per_km_rate DECIMAL(10,2) NOT NULL,
        per_minute_rate DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Tạo bảng surges
    await client.query(`
      CREATE TABLE IF NOT EXISTS surges (
        id SERIAL PRIMARY KEY,
        zone VARCHAR(100) NOT NULL UNIQUE,
        multiplier DECIMAL(5,2) NOT NULL DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Tạo bảng promotions
    await client.query(`
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
    `);
    
    // Tạo bảng historical_estimates
    await client.query(`
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
    `);
    
    // Tạo indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
      CREATE INDEX IF NOT EXISTS idx_historical_timestamp ON historical_estimates(timestamp);
    `);
    
    // Insert dữ liệu mẫu
    await client.query(`
      INSERT INTO pricings (vehicle_type, base_fare, per_km_rate, per_minute_rate) VALUES
      ('car', 10000, 5000, 1000),
      ('suv', 15000, 7000, 1200),
      ('bike', 5000, 3000, 500)
      ON CONFLICT (vehicle_type) DO NOTHING;
    `);
    
    await client.query(`
      INSERT INTO surges (zone, multiplier) VALUES
      ('CENTER', 1.5),
      ('AIRPORT', 2.0),
      ('SUBURB', 1.0)
      ON CONFLICT (zone) DO NOTHING;
    `);
    
    console.log('✅ Database tables created/verified');
  } catch (error) {
    console.error('⚠️ Init database warning:', error.message);
  } finally {
    client.release();
  }
};

// Khởi tạo database và bảng
(async () => {
  await ensureDatabase();
  await initTables();
})();

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};