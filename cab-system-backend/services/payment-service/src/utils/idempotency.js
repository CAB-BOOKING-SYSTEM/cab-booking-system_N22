const db = require("../config/db");

async function checkDuplicate(key) {
  const res = await db.pool.query(
    "SELECT * FROM idempotency_keys WHERE key=$1",
    [key]
  );
  return res.rows[0];
}

async function saveKey(key, response) {
  await db.pool.query(
    "INSERT INTO idempotency_keys(key, response) VALUES($1,$2)",
    [key, response]
  );
}

module.exports = { checkDuplicate, saveKey };