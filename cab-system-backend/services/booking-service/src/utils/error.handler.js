// src/utils/error.handler.js
class AppError extends Error {
  constructor(statusCode, message, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(400, message);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(404, `${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(409, message);
    this.name = 'ConflictError';
  }
}

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[ERROR] ${statusCode} - ${message}`);
  console.error(err.stack);
  
  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errors: err.errors || undefined,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Cannot ${req.method} ${req.url}`
  });
};

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  errorHandler,
  notFoundHandler
};