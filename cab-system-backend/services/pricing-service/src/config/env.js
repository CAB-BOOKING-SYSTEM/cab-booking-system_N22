const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3006,  
  DB_URL: process.env.DB_URL || 'postgresql://admin:password123@postgres:5432/pricing_db'
};