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
      const dbName = process.env.DB_NAME || 'driver_db';
      
      const defaultPool = new Pool({
        host: process.env.DB_HOST || 'postgres',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'admin',
        password: process.env.DB_PASSWORD || 'password123',
        database: 'postgres',
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      const checkDbQuery = 'SELECT 1 FROM pg_database WHERE datname = $1';
      const res = await defaultPool.query(checkDbQuery, [dbName]);
      
      if (res.rowCount === 0) {
        await defaultPool.query(`CREATE DATABASE ${dbName}`);
        logger.info(`✅ Database ${dbName} created successfully`);
      }
      
      await defaultPool.end();

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
      
      // Thêm cột auth_user_id nếu chưa có (migration)
      try {
        await this.pgPool.query(`
          ALTER TABLE drivers ADD COLUMN IF NOT EXISTS auth_user_id INTEGER UNIQUE
        `);
        await this.pgPool.query(`
          CREATE INDEX IF NOT EXISTS idx_drivers_auth_user_id ON drivers(auth_user_id)
        `);
        logger.info('✅ Added auth_user_id column to drivers table');
      } catch (migrateError) {
        logger.warn('⚠️ Migration warning:', migrateError.message);
      }
      
      logger.info('✅ Database schema initialized successfully');
    } catch (error) {
      logger.warn('⚠️ Init database warning:', error.message);
    }
  }

  async connectMongoDB() {
    try {
      const mongoUrl = process.env.MONGO_URL || 'mongodb://admin:password123@mongodb:27017/driver_db?authSource=admin';
      await mongoose.connect(mongoUrl, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
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

  static getPool() {
    const instance = global.databaseInstance || new Database();
    if (!instance.pgPool) {
      throw new Error('PostgreSQL not initialized. Call connectPostgreSQL() first.');
    }
    return instance.pgPool;
  }

  static async query(text, params) {
    const pool = this.getPool();
    return pool.query(text, params);
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

const databaseInstance = new Database();
module.exports = databaseInstance;
module.exports.getPool = Database.getPool;
module.exports.query = Database.query;