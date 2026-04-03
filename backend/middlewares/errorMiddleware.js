/**
 * Global Error Handler Middleware
 * Catch tất cả errors và format theo chuẩn
 */

const logger = require('../services/logger');
const { getStatusCodeFromErrorCode, ERROR_CODES } = require('../utils/errorHandler');

/**
 * Global error handler middleware
 * Phải được đặt CUỐI cùng trong app.use() chain
 */
const errorHandler = (err, req, res, next) => {
  const errorCode = err.code || ERROR_CODES.INTERNAL_ERROR;
  const statusCode = err.statusCode || getStatusCodeFromErrorCode(errorCode);
  const errorMessage = err.message || 'Lỗi máy chủ. Vui lòng thử lại sau.';

  logger.error('API Error', {
    statusCode,
    errorCode,
    message: errorMessage,
    url: req.originalUrl,
    method: req.method,
    userAgent: req.get('user-agent'),
    stack: err.stack,
  });

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
    code: errorCode,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Wrap async route handlers để catch errors
 * Dùng như: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Custom error class để throw errors có structure
 */
class APIError extends Error {
  constructor(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 500) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'APIError';
  }
}

module.exports = {
  errorHandler,
  asyncHandler,
  APIError,
};
