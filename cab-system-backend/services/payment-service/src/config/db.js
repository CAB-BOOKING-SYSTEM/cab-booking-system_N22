const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DB_URL,
});

module.exports = pool;
