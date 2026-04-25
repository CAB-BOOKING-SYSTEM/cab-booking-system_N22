const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  const userRole = req.headers['x-user-role'];

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized: Missing user identity" });
  }

  req.user = {
    id: userId,
    userId: userId,
    role: userRole,
  };
  
  next();
};

module.exports = authMiddleware;
