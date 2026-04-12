// const logger = require('../logger/logger'); // Xóa dòng này

const errorHandler = (err, req, res, next) => {
  console.error('Error:', { 
    message: err.message, 
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.status = 404;
  next(error);
};

module.exports = { errorHandler, notFound };