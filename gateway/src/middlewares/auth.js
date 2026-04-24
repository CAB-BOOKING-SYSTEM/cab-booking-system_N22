const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      code: "TOKEN_MISSING",
      message: "Unauthorized: No token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.log(error);

    // Phân loại lỗi dựa trên đặc điểm của thư viện jsonwebtoken
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Unauthorized: Token has expired",
        expiredAt: error.expiredAt, // Trả thêm thời điểm hết hạn nếu cần
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        code: "TOKEN_INVALID",
        message: "Unauthorized: Invalid token signature or format",
      });
    }

    return res.status(401).json({
      code: "AUTH_ERROR",
      message: "Unauthorized: Authentication failed",
    });
  }
};
