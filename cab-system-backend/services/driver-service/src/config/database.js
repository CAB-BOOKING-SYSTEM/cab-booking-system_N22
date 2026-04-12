const mongoose = require('mongoose');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pgPool = null;
    this.mongoConnection = null;
  }

  async connectPostgreSQL() {
    try {
      // Bước 1: Kết nối đến database mặc định (postgres) để tạo database
      const defaultPool = new Pool({
        host: process.env.DB_HOST || 'postgres',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'password123',
        database: 'postgres', // Kết nối đến database mặc định
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Tạo database nếu chưa tồn tại
      const dbName = process.env.DB_NAME || 'driver_db';
      await defaultPool.query(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
      await defaultPool.end();

      // Bước 2: Kết nối đến database vừa tạo
      this.pgPool = new Pool({
        host: process.env.DB_HOST || 'postgres',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'password123',
        database: dbName,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      await this.pgPool.query('SELECT NOW()');
      logger.info('✅ PostgreSQL connected successfully');
      
      // Chạy init.sql để tạo bảng
      await this.initDatabase();
      
      return this.pgPool;
    } catch (error) {
      logger.error('❌ PostgreSQL connection error:', error);
      throw error;
    }
  }

  async initDatabase() {
    try {
      const initSqlPath = path.join(__dirname, '../../scripts/init.sql');
      
      if (!fs.existsSync(initSqlPath)) {
        logger.warn(`⚠️ Init SQL file not found at ${initSqlPath}, skipping...`);
        return;
      }

      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      
      const statements = initSql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        try {
          await this.pgPool.query(statement);
        } catch (stmtError) {
          if (!stmtError.message.includes('already exists') && 
              !stmtError.message.includes('duplicate key') &&
              !stmtError.message.includes('already defined')) {
            logger.warn('SQL statement error:', stmtError.message);
          }
        }
      }
      
      logger.info('✅ Database schema initialized successfully');
    } catch (error) {
      logger.warn('⚠️ Init database warning:', error.message);
    }
  }

  async connectMongoDB() {
    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://mongodb:27017/driver_db';
      await mongoose.connect(mongoUrl);
      
      this.mongoConnection = mongoose.connection;
      logger.info('✅ MongoDB connected successfully');
      return this.mongoConnection;
    } catch (error) {
      logger.error('❌ MongoDB connection error:', error);
      throw error;
    }
  }

  getPGPool() {
    if (!this.pgPool) {
      throw new Error('PostgreSQL not initialized');
    }
    return this.pgPool;
  }

  getMongoConnection() {
    if (!this.mongoConnection) {
      throw new Error('MongoDB not initialized');
    }
    return this.mongoConnection;
  }

  async closeConnections() {
    if (this.pgPool) await this.pgPool.end();
    if (this.mongoConnection) await this.mongoConnection.close();
    logger.info('Database connections closed');
  }
}

module.exports = new Database();