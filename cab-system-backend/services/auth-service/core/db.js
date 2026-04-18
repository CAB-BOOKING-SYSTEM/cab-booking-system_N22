import "dotenv/config";
import pg from "pg";
const { Pool } = pg;

const connectionOptions = process.env.DB_URL
  ? { connectionString: process.env.DB_URL }
  : {
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
    };

const pool = new Pool(connectionOptions);

const ensureAuthSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id SERIAL PRIMARY KEY,
      phone_number VARCHAR(20) UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      google_id VARCHAR(255) UNIQUE,
      facebook_id VARCHAR(255) UNIQUE,
      provider VARCHAR(50),
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      avatar_url TEXT,
      role VARCHAR(50) NOT NULL DEFAULT 'customer',
      status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
      email_verified BOOLEAN DEFAULT FALSE,
      phone_verified BOOLEAN DEFAULT FALSE,
      email_verified_at TIMESTAMP,
      phone_verified_at TIMESTAMP,
      last_login TIMESTAMP,
      last_activity TIMESTAMP,
      login_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      deleted_at TIMESTAMP
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_status ON auth_users(status)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role)`,
  );
};
// Test kết nối khi khởi tạo pool
pool.on("connect", () => {
  console.log("✅ Database connected successfully!");
});

pool.on("error", (err) => {
  console.error("❌ Unexpected error on idle client", err);
});

// Test kết nối ngay lập tức
try {
  await ensureAuthSchema();
  const result = await pool.query("SELECT NOW()");
  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║          ✅ DATABASE CONNECTION SUCCESSFUL             ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  if (process.env.DB_URL) {
    console.log(`📋 Connected via DB_URL: ${process.env.DB_URL}`);
  } else {
    console.log(
      `📋 Connected to: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    );
    console.log(`👤 User: ${process.env.DB_USER}`);
  }
  console.log(`🕐 Server time: ${result.rows[0].now}`);
  console.log("╔════════════════════════════════════════════════════════╝");
} catch (error) {
  console.error("╔════════════════════════════════════════════════════════╗");
  console.error("║        ❌ DATABASE CONNECTION FAILED                  ║");
  console.error("╚════════════════════════════════════════════════════════╝");
  console.error("Error:", error.message);
  process.exit(1);
}

export default pool;
