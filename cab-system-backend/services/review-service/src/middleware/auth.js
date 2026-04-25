/**
 * Zero Trust local auth middleware for review-service.
 * Reads user context from headers passed by API Gateway.
 */
module.exports = (req, res, next) => {
  try {
    if (req.headers["x-gateway-proxy"] !== "true") {
      return res.status(403).json({
        message: "Forbidden: review APIs must be called through API Gateway",
      });
    }

    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized: Missing user identity",
      });
    }

    req.user = {
      id: userId,
      userId: userId,
      role: userRole,
    };
    
    return next();
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error during authentication",
    });
  }
};
