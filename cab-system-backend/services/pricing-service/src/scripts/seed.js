require('dotenv').config();
const { pool } = require('../config/dbConfig');
const fs = require('fs');
const path = require('path');

const seedData = async () => {
  try {
    const client = await pool.connect();
    const sql = fs.readFileSync(path.join(__dirname, '../database/init.sql'), 'utf8');
    
    // Split SQL statements
    const statements = sql.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
        console.log('✅ Executed SQL statement');
      }
    }
    
    console.log('✅ Seed data created successfully');
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
};

seedData();