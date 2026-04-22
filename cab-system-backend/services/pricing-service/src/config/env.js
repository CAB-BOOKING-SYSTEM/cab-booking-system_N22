const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5005,
  DB_URL: process.env.DB_URL || 'postgresql://postgres:postgres123@postgres:5432/pricing_db'
};