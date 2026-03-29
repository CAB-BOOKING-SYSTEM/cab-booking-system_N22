const app = require('./app');
const connectDB = require('./database/dbConnection');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    // Kết nối PostgreSQL
    await connectDB();
    
    app.listen(PORT, () => {
      console.log(`🚀 Pricing Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();