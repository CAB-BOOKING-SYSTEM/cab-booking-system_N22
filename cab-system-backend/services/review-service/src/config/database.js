const { Pool } = require("pg");

let poolInstance = null;

const maskConnectionString = (connectionString) =>
  connectionString.replace(/:(.*?)@/, ":****@");

const sleep = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const resolveConnectionString = () => {
  if (process.env.DB_URL) {
    return process.env.DB_URL;
  }

  const user = process.env.POSTGRES_USER || process.env.PGUSER || "admin";
  const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD || "password123";
  const host = process.env.POSTGRES_HOST || process.env.PGHOST || "localhost";
  const port = process.env.POSTGRES_PORT || process.env.PGPORT || 5432;
  const database = process.env.REVIEW_DB_NAME || process.env.PGDATABASE || "review_db";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const getDatabaseConfig = () => {
  const connectionString = resolveConnectionString();

  return {
    connectionString,
  };
};

const getPool = () => {
  if (!poolInstance) {
    const config = getDatabaseConfig();
    console.log(`[DB] Using connection target: ${maskConnectionString(config.connectionString)}`);

    poolInstance = new Pool(config);

    poolInstance.on("error", (error) => {
      console.error("[DB] Unexpected PostgreSQL error:", error);
    });
  }

  return poolInstance;
};

const connectDatabase = async () => {
  const maxRetries = Number(process.env.DB_CONNECT_MAX_RETRIES || 10);
  const retryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS || 3000);
  const pool = getPool();

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      await pool.query("SELECT 1");
      console.log("[DB] PostgreSQL connected successfully");
      return pool;
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      console.error(
        `[DB] PostgreSQL connection failed (attempt ${attempt}/${maxRetries}):`,
        error
      );

      if (error.code === "28P01") {
        console.error(
          "[DB] Invalid credentials. Set DB_URL or POSTGRES_USER/POSTGRES_PASSWORD correctly in .env."
        );
      }

      if (isLastAttempt) {
        throw error;
      }

      await sleep(retryDelayMs);
    }
  }
};

module.exports = {
  connectDatabase,
  getPool,
};
