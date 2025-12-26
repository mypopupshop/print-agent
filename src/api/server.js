const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const logger = require('../utils/logger');

// Middleware
const errorHandler = require('./middleware/error-handler');
const requestLogger = require('./middleware/logger');

// Routes
const printReceiptRoute = require('./routes/print-receipt');
const printLabelRoute = require('./routes/print-label');
const printA4Route = require('./routes/print-a4');
const printersRoute = require('./routes/printers');

/**
 * Create and configure Express application
 * @param {Object} config - Application configuration
 * @returns {express.Application} Configured Express app
 */
function createServer(config) {
  const app = express();

  // Parse JSON bodies (with 10MB limit for base64 PDFs)
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  // Enable CORS for localhost only
  app.use(cors({
    origin: ['http://localhost:*', 'http://127.0.0.1:*'],
    credentials: true
  }));

  // Request logging
  app.use(requestLogger);

  // Security: Only accept connections from localhost
  app.use((req, res, next) => {
    const host = req.hostname;

    if (host !== 'localhost' && host !== '127.0.0.1') {
      logger.warn(`Access denied from non-localhost host: ${host}`);
      return res.status(403).json({
        status: 'error',
        error: 'ACCESS_DENIED',
        message: 'API only accessible from localhost'
      });
    }

    next();
  });

  // Mount routes
  app.use(printReceiptRoute);
  app.use(printLabelRoute);
  app.use(printA4Route);
  app.use(printersRoute);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });

  // Root endpoint - API info
  app.get('/', (req, res) => {
    res.json({
      name: 'Print Agent API',
      version: '1.0.0',
      endpoints: {
        'POST /print/receipt': 'Print ESC/POS to thermal printer',
        'POST /print/label': 'Print TSPL/ZPL to label printer',
        'POST /print/a4': 'Print PDF/HTML to A4 printer',
        'GET /printers': 'List all printers',
        'GET /status': 'Get system status',
        'GET /health': 'Health check'
      }
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      error: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`
    });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}

/**
 * Start API server
 * @param {number} port - Port to listen on
 * @param {Object} config - Application configuration
 * @returns {Promise<http.Server>} HTTP server instance
 */
async function startAPIServer(port, config) {
  const app = createServer(config);

  return new Promise((resolve, reject) => {
    const server = app.listen(port, 'localhost', (err) => {
      if (err) {
        logger.error('Failed to start API server:', err);
        reject(err);
      } else {
        logger.info(`✓ API Server running on http://localhost:${port}`);
        resolve(server);
      }
    });

    // Handle server errors
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`);
        reject(new Error(`PORT_IN_USE: ${port}`));
      } else {
        logger.error('Server error:', err);
        reject(err);
      }
    });
  });
}

module.exports = { createServer, startAPIServer };
