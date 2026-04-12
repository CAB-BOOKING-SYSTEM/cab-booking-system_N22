const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class Database {
  constructor() {
    this.pgPool = null;
  }

  async connectPostgreSQL() {
    try {
      const dbName = process.env.DB_NAME || 'matching_db';
      const host = process.env.DB_HOST || 'postgres';
      const port = process.env.DB_PORT || 5432;
      const user = process.env.DB_USER || 'admin';
      const password = process.env.DB_PASSWORD || 'password123';

      // Bước 1: Kết nối đến database mặc định 'postgres' để tạo database
      const defaultPool = new Pool({
        host,
        port,
        user,
        password,
        database: 'postgres',
      });

      // Kiểm tra database đã tồn tại chưa
      const checkResult = await defaultPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );

      if (checkResult.rows.length === 0) {
        // Tạo database nếu chưa tồn tại
        await defaultPool.query(`CREATE DATABASE ${dbName}`);
        logger.info(`✅ Database ${dbName} created successfully`);
      } else {
        logger.info(`✅ Database ${dbName} already exists`);
      }

      await defaultPool.end();

      // Bước 2: Kết nối đến database chính
      this.pgPool = new Pool({
        host,
        port,
        user,
        password,
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
      
      // Kiểm tra file có tồn tại không
      if (!fs.existsSync(initSqlPath)) {
        logger.warn(`⚠️ Init SQL file not found at ${initSqlPath}, skipping...`);
        return;
      }

      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      
      // Bỏ qua dòng \c matching_db vì đã ở trong database rồi
      const cleanSql = initSql.replace(/\\c matching_db;/g, '');
      
      // Tách các câu lệnh SQL (split by semicolon)
      const statements = cleanSql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        try {
          await this.pgPool.query(statement);
        } catch (stmtError) {
          // Bỏ qua lỗi "already exists"
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

  getPGPool() {
    if (!this.pgPool) {
      throw new Error('PostgreSQL not initialized');
    }
    return this.pgPool;
  }

  async closeConnections() {
    if (this.pgPool) await this.pgPool.end();
    logger.info('Database connections closed');
  }
}

module.exports = new Database();