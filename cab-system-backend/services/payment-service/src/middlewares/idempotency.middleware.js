const { checkDuplicate } = require("../utils/idempotency");

const idempotencyMiddleware = async (req, res, next) => {
  const key = req.headers["idempotency-key"];

  if (!key) return next();

  const existing = await checkDuplicate(key);

  if (existing) {
    return res.json({
      message: "Duplicate request",
      data: existing,
    });
  }

  req.idempotencyKey = key;
  next();
};

module.exports = idempotencyMiddleware;