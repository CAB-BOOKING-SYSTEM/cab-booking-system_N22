const jwt = require("jsonwebtoken");

/**
 * Zero Trust local auth middleware for review-service.
 * Requires Bearer JWT and validates with JWT_SECRET.
 */
module.exports = (req, res, next) => {
  try {
    if (req.headers["x-gateway-proxy"] !== "true") {
      return res.status(403).json({
        message: "Forbidden: review APIs must be called through API Gateway",
      });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Unauthorized: No token provided",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded;
    return next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Unauthorized: Token expired",
      });
    }

    return res.status(403).json({
      message: "Forbidden: Invalid token",
    });
  }
};
