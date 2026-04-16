const { pool } = require('../config/dbConfig');

const healthCheck = async (req, res) => {
  let dbStatus = 'disconnected';
  
  try {
    // Kiểm tra kết nối database
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    dbStatus = 'connected';
  } catch (error) {
    console.error('Database health check failed:', error.message);
    dbStatus = 'disconnected';
  }

  const health = {
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: dbStatus
      }
    }
  };

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json(health);
};

module.exports = { healthCheck };