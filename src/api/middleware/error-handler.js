const logger = require('../../utils/logger');
const ErrorCodes = require('../../utils/error-codes');

/**
 * Global error handler middleware
 * Catches all unhandled errors and returns appropriate response
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  // Determine status code
  let statusCode = 500;
  let errorCode = ErrorCodes.INTERNAL_ERROR;

  if (err.message.includes('PRINTER_OFFLINE')) {
    statusCode = 503;
    errorCode = ErrorCodes.PRINTER_OFFLINE;
  } else if (err.message.includes('PRINTER_NOT_FOUND')) {
    statusCode = 404;
    errorCode = ErrorCodes.PRINTER_NOT_FOUND;
  } else if (err.message.includes('INVALID_DATA')) {
    statusCode = 400;
    errorCode = ErrorCodes.INVALID_DATA;
  }

  res.status(statusCode).json({
    status: 'error',
    error: errorCode,
    message: err.message
  });
}

module.exports = errorHandler;
