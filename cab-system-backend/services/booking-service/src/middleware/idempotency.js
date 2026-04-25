// src/middleware/idempotency.js
const { v4: uuidv4 } = require('uuid');

// Lưu trữ tạm (nên dùng Redis trong production)
const idempotencyStore = new Map();

const idempotencyMiddleware = async (req, res, next) => {
  // Chỉ áp dụng cho POST, PUT, PATCH
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['idempotency-key'];
  
  // Nếu không có key, tạo tự động (tùy chọn)
  if (!idempotencyKey) {
    // Vẫn cho phép request nhưng không có idempotency
    return next();
  }

  // Kiểm tra trong store
  const cached = idempotencyStore.get(idempotencyKey);
  
  if (cached) {
    console.log(`🔄 Idempotency hit: ${idempotencyKey}`);
    // Trả về kết quả cũ
    return res.status(200).json(cached.response);
  }

  // Lưu lại res.json để intercept response
  const originalJson = res.json;
  res.json = function(data) {
    // Lưu response vào store trước khi gửi
    idempotencyStore.set(idempotencyKey, {
      response: data,
      timestamp: Date.now(),
      statusCode: res.statusCode
    });
    
    // Xóa sau 1 giờ
    setTimeout(() => {
      idempotencyStore.delete(idempotencyKey);
    }, 3600000);
    
    originalJson.call(this, data);
  };
  
  next();
};

module.exports = idempotencyMiddleware;