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

const columnExists = async (tableName, columnName) => {
  const result = await pool.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = $1 AND column_name = $2
    `,
    [tableName, columnName],
  );
  return result.rowCount > 0;
};

const ensureConstraint = async (tableName, constraintName, definition) => {
  await pool.query(
    `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = '${constraintName}'
        ) THEN
          ALTER TABLE ${tableName}
          ADD CONSTRAINT ${constraintName} ${definition};
        END IF;
      END
      $$;
    `,
  );
};

const dropLegacyConstraints = async () => {
  const legacyConstraints = [
    "auth_users_role_check",
    "auth_users_role_ck",
    "auth_users_status_check",
    "auth_users_status_ck",
    "auth_users_driver_status_check",
    "auth_users_driver_status_ck",
    "auth_users_driver_role_check",
    "auth_users_driver_role_ck",
  ];

  for (const constraintName of legacyConstraints) {
    await pool.query(
      `ALTER TABLE auth_users DROP CONSTRAINT IF EXISTS ${constraintName}`,
    );
  }
};

const ensureAuthSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_users (
      id SERIAL PRIMARY KEY,
      full_name VARCHAR(100),
      phone_number VARCHAR(20) UNIQUE,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'customer',
      status VARCHAR(20) DEFAULT 'ACTIVE',
      provider VARCHAR(50) DEFAULT 'email',
      avatar_url TEXT,
      driver_id VARCHAR(50) UNIQUE,
      driver_status VARCHAR(20),
      email_verified BOOLEAN DEFAULT FALSE,
      failed_login_count INT DEFAULT 0,
      locked_until TIMESTAMP,
      last_login TIMESTAMP,
      last_activity TIMESTAMP,
      login_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `);

  const additionalColumns = [
    "full_name VARCHAR(100)",
    "phone_number VARCHAR(20)",
    "role VARCHAR(20) DEFAULT 'customer'",
    "status VARCHAR(20) DEFAULT 'ACTIVE'",
    "provider VARCHAR(50) DEFAULT 'email'",
    "avatar_url TEXT",
    "driver_id VARCHAR(50)",
    "driver_status VARCHAR(20)",
    "email_verified BOOLEAN DEFAULT FALSE",
    "failed_login_count INT DEFAULT 0",
    "locked_until TIMESTAMP",
    "last_login TIMESTAMP",
    "last_activity TIMESTAMP",
    "login_count INT DEFAULT 0",
    "updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "deleted_at TIMESTAMP",
  ];

  for (const columnDefinition of additionalColumns) {
    await pool.query(
      `ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS ${columnDefinition}`,
    );
  }

  const hasFirstName = await columnExists("auth_users", "first_name");
  if (hasFirstName) {
    await pool.query(`
      UPDATE auth_users
      SET full_name = COALESCE(
        NULLIF(TRIM(full_name), ''),
        NULLIF(TRIM(first_name), ''),
        split_part(email, '@', 1)
      )
      WHERE full_name IS NULL OR TRIM(full_name) = ''
    `);
  } else {
    await pool.query(`
      UPDATE auth_users
      SET full_name = COALESCE(
        NULLIF(TRIM(full_name), ''),
        split_part(email, '@', 1)
      )
      WHERE full_name IS NULL OR TRIM(full_name) = ''
    `);
  }

  await pool.query(`
    UPDATE auth_users
    SET
      role = CASE
        WHEN LOWER(role) = 'rider' THEN 'customer'
        WHEN LOWER(role) IN ('customer', 'driver', 'admin') THEN LOWER(role)
        ELSE 'customer'
      END,
      status = UPPER(COALESCE(status, 'ACTIVE')),
      driver_status = CASE
        WHEN driver_status IS NULL OR TRIM(driver_status) = '' THEN NULL
        ELSE UPPER(driver_status)
      END,
      provider = LOWER(COALESCE(provider, 'email'))
  `);

  await pool.query(`
    ALTER TABLE auth_users
    ALTER COLUMN full_name SET NOT NULL
  `);

  await pool.query(`
    ALTER TABLE auth_users
    ALTER COLUMN role SET DEFAULT 'customer'
  `);

  await pool.query(`
    ALTER TABLE auth_users
    ALTER COLUMN status SET DEFAULT 'ACTIVE'
  `);

  await pool.query(`
    ALTER TABLE auth_users
    ALTER COLUMN provider SET DEFAULT 'email'
  `);

  await dropLegacyConstraints();

  await ensureConstraint(
    "auth_users",
    "auth_users_role_ck",
    "CHECK (role IN ('customer', 'driver', 'admin'))",
  );
  await ensureConstraint(
    "auth_users",
    "auth_users_status_ck",
    "CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'BANNED', 'LOCKED', 'PENDING_VERIFICATION'))",
  );
  await ensureConstraint(
    "auth_users",
    "auth_users_driver_status_ck",
    "CHECK (driver_status IS NULL OR driver_status IN ('ONLINE', 'OFFLINE', 'BUSY'))",
  );
  await ensureConstraint(
    "auth_users",
    "auth_users_driver_role_ck",
    "CHECK ((role = 'driver' AND driver_id IS NOT NULL) OR role <> 'driver')",
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      token_hash VARCHAR(255) NOT NULL,
      session_id VARCHAR(255) UNIQUE,
      device_info JSONB,
      device_fingerprint VARCHAR(255),
      ip_address INET,
      expires_at TIMESTAMP NOT NULL,
      is_revoked BOOLEAN DEFAULT FALSE,
      revoked_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS auth_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      user_id INT REFERENCES auth_users(id) ON DELETE SET NULL,
      event_type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL,
      reason VARCHAR(255),
      ip_address INET,
      user_agent VARCHAR(500),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      session_id VARCHAR(255) NOT NULL UNIQUE,
      refresh_token_hash VARCHAR(255),
      ip_address INET,
      user_agent VARCHAR(500),
      device_fingerprint VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      ended_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS token_blacklist (
      id BIGSERIAL PRIMARY KEY,
      token_hash VARCHAR(255) NOT NULL UNIQUE,
      token_type VARCHAR(20) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_phone ON auth_users(phone_number)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_email ON auth_users(email)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_status ON auth_users(status)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_role ON auth_users(role)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_users_driver_id ON auth_users(driver_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session_id ON refresh_tokens(session_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_user_id ON auth_audit_logs(user_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_auth_audit_logs_event_type ON auth_audit_logs(event_type)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id)`,
  );
};

pool.on("connect", () => {
  console.log("Database connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

try {
  await ensureAuthSchema();
  const result = await pool.query("SELECT NOW()");
  console.log("AUTH DB READY");
  console.log(`Server time: ${result.rows[0].now}`);
} catch (error) {
  console.error("AUTH DB INIT FAILED");
  console.error("Error:", error.message);
  process.exit(1);
}

export default pool;
