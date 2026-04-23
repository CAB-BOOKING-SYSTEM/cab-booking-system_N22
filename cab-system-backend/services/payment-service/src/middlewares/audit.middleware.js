//D:\bc_bigdata\cab-booking-system_N22\cab-system-backend\services\payment-service\src\middlewares\audit.middleware.js
const logAudit = require("../utils/audit");

const auditMiddleware = (action) => {
  return async (req, res, next) => {
    await logAudit(action, req.body);
    next();
  };
};

module.exports = auditMiddleware;