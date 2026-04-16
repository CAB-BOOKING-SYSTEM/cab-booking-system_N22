const { Pool } = require('pg');
const { DB_URL } = require('./env');

const pool = new Pool({
  connectionString: DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};