const logger = require('../services/logger');

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - start;
    const userId = req.user ? req.user.user_id : 'anonymous';
    const baseMeta = {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      ms,
      userId,
    };

    if (res.statusCode >= 500) {
      logger.error('API request failed', baseMeta);
    } else if (res.statusCode >= 400) {
      logger.warn('API request warning', baseMeta);
    } else {
      logger.success('API request completed', baseMeta);
    }
  });

  next();
}

module.exports = requestLogger;
