const logAudit = require("../utils/audit");

const auditMiddleware = (action) => {
  return async (req, res, next) => {
    await logAudit(action, req.body);
    next();
  };
};

module.exports = auditMiddleware;