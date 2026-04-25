// Middleware xác thực (Zero Trust - đọc từ Header do Gateway truyền)
const verifyToken = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];
  
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing user identity'
    });
  }
  
  req.user = {
    id: userId,
    userId: userId,
    role: userRole
  };

  next();
};

// Middleware kiểm tra quyền admin
const verifyAdmin = (req, res, next) => {
  const userRole = req.headers['x-user-role'];

  if (userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Forbidden: Admin role required'
    });
  }

  next();
};

module.exports = {
  verifyToken,
  verifyAdmin
};