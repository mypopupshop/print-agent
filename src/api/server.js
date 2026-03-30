const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const logger = require('../utils/logger');

// Middleware
const errorHandler = require('./middleware/error-handler');
const requestLogger = require('./middleware/logger');

// Routes
const printReceiptRoute = require('./routes/print-receipt');
const printLabelRoute = require('./routes/print-label');
const printA4Route = require('./routes/print-a4');
const printersRoute = require('./routes/printers');
const labelRoute = require('./routes/label');

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

  // Enable CORS for localhost and local network
  app.use(cors({
    origin: function(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      // Allow localhost
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }

      // Allow local network (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const localNetworkRegex = /(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/;
      if (localNetworkRegex.test(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }));

  // Request logging
  app.use(requestLogger);

  // Security: Only accept connections from localhost and local network
  app.use((req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const host = req.hostname;

    // Allow localhost
    if (host === 'localhost' || host === '127.0.0.1' || ip === '127.0.0.1' || ip === '::1') {
      return next();
    }

    // Allow local network IP addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
    const localNetworkRegex = /^(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|::ffff:(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+))$/;

    if (localNetworkRegex.test(ip)) {
      return next();
    }

    logger.warn(`Access denied from non-local IP: ${ip} (host: ${host})`);
    return res.status(403).json({
      status: 'error',
      error: 'ACCESS_DENIED',
      message: 'API only accessible from local network'
    });
  });

  // Serve static dashboard files
  const publicPath = path.join(__dirname, '../../public');
  app.use(express.static(publicPath));

  // Mount routes
  app.use(printReceiptRoute);
  app.use(printLabelRoute);
  app.use(printA4Route);
  app.use(printersRoute);
  app.use(labelRoute);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: Date.now()
    });
  });

  // API info endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'Print Agent API',
      version: '1.0.0',
      endpoints: {
        'POST /print/receipt': 'Print ESC/POS to thermal printer',
        'POST /print/label': 'Print TSPL/ZPL to label printer',
        'POST /print/a4': 'Print PDF/HTML to A4 printer',
        'POST /label': 'Print label using template',
        'GET /label/templates': 'Get all label templates',
        'GET /label/templates/:name': 'Get specific template details',
        'GET /printers': 'List all printers',
        'GET /status': 'Get system status',
        'GET /jobs': 'Get recent print job history',
        'GET /health': 'Health check',
        'GET /api': 'API information',
        'GET /': 'Dashboard (HTML)'
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
    // Listen on all network interfaces (0.0.0.0) instead of just localhost
    const server = app.listen(port, '0.0.0.0', (err) => {
      if (err) {
        logger.error('Failed to start API server:', err);
        reject(err);
      } else {
        const os = require('os');
        const interfaces = os.networkInterfaces();

        // Get local IP addresses
        const addresses = [];
        for (const name of Object.keys(interfaces)) {
          for (const iface of interfaces[name]) {
            // Skip internal and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
              addresses.push(iface.address);
            }
          }
        }

        logger.info(`✓ API Server running on http://localhost:${port}`);
        if (addresses.length > 0) {
          addresses.forEach(addr => {
            logger.info(`✓ Network access: http://${addr}:${port}`);
          });
        }
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
