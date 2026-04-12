const db = require("../config/db");

const logAudit = async (action, data) => {
  await db.pool.query(
    "INSERT INTO audit_logs(action, data) VALUES($1,$2)",
    [action, data]
  );
};

module.exports = logAudit;