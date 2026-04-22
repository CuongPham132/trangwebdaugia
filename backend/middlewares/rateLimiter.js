const rateLimit = require('express-rate-limit');

// ⭐ Rate limiter for bid placement
const bidLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 20, // 20 bids per minute (reasonable for fast auction)
  message: 'Quá nhiều lần đặt giá. Vui lòng chờ 1 phút trước khi thử lại.',
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for admin users (optional)
    return req.user?.role === 'admin';
  },
});

// ⭐ Stricter limiter for account creation/login attempts
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 5, // 5 attempts
  message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.',
  skipSuccessfulRequests: true, // Don't count successful requests
});

// ⭐ Limiter for wallet operations
const walletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 operations per minute
  message: 'Quá nhiều thao tác ví. Vui lòng chờ 1 phút.',
});

module.exports = {
  bidLimiter,
  authLimiter,
  walletLimiter,
};
