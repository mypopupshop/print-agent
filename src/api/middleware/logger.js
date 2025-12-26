const logger = require('../../utils/logger');

/**
 * Request logger middleware
 * Logs all incoming HTTP requests
 */
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log request
  logger.info(`→ ${req.method} ${req.path}`, {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent')
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`← ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
  });

  next();
}

module.exports = requestLogger;
