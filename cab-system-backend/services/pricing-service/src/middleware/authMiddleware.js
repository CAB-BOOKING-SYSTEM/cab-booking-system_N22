// Middleware xác thực JWT (nếu cần)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  // TODO: Verify JWT token
  // Tạm thời bỏ qua xác thực cho development
  next();
};

// Middleware kiểm tra quyền admin
const verifyAdmin = (req, res, next) => {
  // TODO: Check if user has admin role
  next();
};

module.exports = {
  verifyToken,
  verifyAdmin
};