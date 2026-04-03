/**
 * ⭐ STANDARDIZED ERROR CODES
 * Tất cả error responses dùng format này
 */

const ERROR_CODES = {
  // Validation errors (400)
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  PASSWORD_TOO_SHORT: 'PASSWORD_TOO_SHORT',
  EMAIL_ALREADY_EXISTS: 'EMAIL_ALREADY_EXISTS',
  USERNAME_TAKEN: 'USERNAME_TAKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  BID_NOT_FOUND: 'BID_NOT_FOUND',
  INVALID_ROLE: 'INVALID_ROLE',

  // Authentication/Authorization errors (401/403)
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  FORBIDDEN: 'FORBIDDEN',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Business logic errors (400)
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  AUCTION_NOT_ACTIVE: 'AUCTION_NOT_ACTIVE',
  AUCTION_ENDED: 'AUCTION_ENDED',
  AUCTION_NOT_STARTED: 'AUCTION_NOT_STARTED',
  RACE_CONDITION: 'RACE_CONDITION',
  SELLER_CANNOT_BID: 'SELLER_CANNOT_BID',
  WINNING_BID_CANNOT_DELETE: 'WINNING_BID_CANNOT_DELETE',
  INVALID_BID_AMOUNT: 'INVALID_BID_AMOUNT',
  ALREADY_COMPLETED: 'ALREADY_COMPLETED',
  CANNOT_DELETE: 'CANNOT_DELETE',

  // Server errors (500)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
};

/**
 * Standardized API Response Classes
 */
class SuccessResponse {
  constructor(data, message = null) {
    this.success = true;
    this.data = data;
    if (message) {
      this.message = message;
    }
  }
}

class ErrorResponse {
  constructor(message, code = 'INTERNAL_ERROR', statusCode = 500, data = null) {
    this.success = false;
    this.error = message;
    this.code = code;
    this.statusCode = statusCode;
    if (data) {
      this.data = data;
    }
  }
}

/**
 * Utility functions to create responses
 */
const createSuccessResponse = (data, message = null) => {
  return new SuccessResponse(data, message);
};

const createErrorResponse = (message, code = 'INTERNAL_ERROR', statusCode = 500, data = null) => {
  return new ErrorResponse(message, code, statusCode, data);
};

/**
 * Generate appropriate HTTP status code from error code
 */
const getStatusCodeFromErrorCode = (code) => {
  const statusMap = {
    // 400 - Bad Request
    INVALID_INPUT: 400,
    INVALID_EMAIL: 400,
    INVALID_PASSWORD: 400,
    PASSWORD_TOO_SHORT: 400,
    EMAIL_ALREADY_EXISTS: 400,
    USERNAME_TAKEN: 400,
    INVALID_ROLE: 400,
    INSUFFICIENT_BALANCE: 400,
    AUCTION_NOT_ACTIVE: 400,
    AUCTION_ENDED: 400,
    AUCTION_NOT_STARTED: 400,
    RACE_CONDITION: 400,
    SELLER_CANNOT_BID: 400,
    WINNING_BID_CANNOT_DELETE: 400,
    INVALID_BID_AMOUNT: 400,
    ALREADY_COMPLETED: 400,
    CANNOT_DELETE: 400,

    // 401 - Unauthorized
    UNAUTHORIZED: 401,
    INVALID_TOKEN: 401,

    // 403 - Forbidden
    FORBIDDEN: 403,
    PERMISSION_DENIED: 403,

    // 404 - Not Found
    USER_NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,
    BID_NOT_FOUND: 404,

    // 500 - Internal Server Error
    INTERNAL_ERROR: 500,
    DATABASE_ERROR: 500,
    PAYMENT_FAILED: 500,
  };

  return statusMap[code] || 500;
};

module.exports = {
  ERROR_CODES,
  SuccessResponse,
  ErrorResponse,
  createSuccessResponse,
  createErrorResponse,
  getStatusCodeFromErrorCode,
};
