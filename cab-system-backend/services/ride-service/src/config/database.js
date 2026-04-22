const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(process.env.DB_URL, {
  dialect: "postgres",
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

const connectDB = async (retries = 5) => {
  while (retries) {
    try {
      await sequelize.authenticate();
      console.log("PostgreSQL connected with Sequelize");
      return;
    } catch (err) {
      console.error("Sequelize connection error, retrying in 5 seconds...", err.message);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000));
    }
  }
  console.error("Could not connect to PostgreSQL after multiple retries");
  process.exit(1);
};

module.exports = { sequelize, connectDB };
