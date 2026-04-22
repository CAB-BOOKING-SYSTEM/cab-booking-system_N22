const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.pgPool = null;
  }

  async connectPostgreSQL() {
    try {
      const dbName = process.env.DB_NAME || 'user_db';
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
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Kiểm tra database đã tồn tại chưa
      const checkResult = await defaultPool.query(
        "SELECT 1 FROM pg_database WHERE datname = $1",
        [dbName]
      );

      if (checkResult.rows.length === 0) {
        await defaultPool.query(`CREATE DATABASE ${dbName}`);
        console.log(`✅ Database ${dbName} created successfully`);
      } else {
        console.log(`✅ Database ${dbName} already exists`);
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
      console.log('✅ PostgreSQL connected successfully');
      
      // Chạy init.sql để tạo bảng
      await this.initDatabase();
      
      return this.pgPool;
    } catch (error) {
      console.error('❌ PostgreSQL connection error:', error);
      throw error;
    }
  }

  async initDatabase() {
    try {
      const initSqlPath = path.join(__dirname, '../scripts/init.sql');
      
      if (!fs.existsSync(initSqlPath)) {
        console.warn(`⚠️ Init SQL file not found at ${initSqlPath}, skipping...`);
        return;
      }

      const initSql = fs.readFileSync(initSqlPath, 'utf8');
      const statements = initSql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        try {
          await this.pgPool.query(statement);
        } catch (stmtError) {
          if (!stmtError.message.includes('already exists') && 
              !stmtError.message.includes('duplicate key')) {
            console.warn('SQL statement error:', stmtError.message);
          }
        }
      }
      
      console.log('✅ Database schema initialized successfully');
    } catch (error) {
      console.warn('⚠️ Init database warning:', error.message);
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
    console.log('Database connections closed');
  }
}

module.exports = new Database();