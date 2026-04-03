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
const printStickerRoute = require('./routes/print-sticker');
const printDiscountStickerRoute = require('./routes/print-discount-sticker');

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

      // Allow Popup webapp (POS runs on mypopup.shop subdomains)
      if (origin.endsWith('.mypopup.shop') || origin.endsWith('.getpopup.in') || origin === 'https://mypopup.shop' || origin === 'https://getpopup.in') {
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
  app.use(express.static(publicPath, { etag: false, maxAge: 0 }));

  // Mount routes
  app.use(printReceiptRoute);
  app.use(printLabelRoute);
  app.use(printA4Route);
  app.use(printersRoute);
  app.use(labelRoute);
  app.use(printStickerRoute);
  app.use(printDiscountStickerRoute);

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
        'POST /print/sticker': 'Print sticker label from structured JSON',
        'POST /print/discount-sticker': 'Print discounted sticker label from structured JSON',
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
 * Start API server (HTTP + HTTPS)
 * @param {number} port - Port to listen on
 * @param {Object} config - Application configuration
 * @returns {Promise<http.Server>} HTTP server instance
 */
async function startAPIServer(port, config) {
  const app = createServer(config);
  const os = require('os');

  // Gather local IPs for logging
  const addresses = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }

  // Start HTTP server
  const httpServer = await new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', (err) => {
      if (err) {
        logger.error('Failed to start HTTP server:', err);
        reject(err);
      } else {
        logger.info(`✓ HTTP Server running on http://localhost:${port}`);
        addresses.forEach(addr => {
          logger.info(`✓ Network access: http://${addr}:${port}`);
        });
        resolve(server);
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${port} is already in use`);
        reject(new Error(`PORT_IN_USE: ${port}`));
      } else {
        logger.error('HTTP server error:', err);
        reject(err);
      }
    });
  });

  // Start HTTPS server on port + 1 (e.g. 6320)
  const httpsPort = port + 1;
  try {
    const { loadOrCreateCert } = require('../utils/ssl');
    logger.info('Loading SSL credentials...');
    const credentials = loadOrCreateCert();
    if (credentials) {
      logger.info('SSL credentials loaded, starting HTTPS server...');
      const https = require('https');
      const httpsServer = https.createServer(credentials, app);

      await new Promise((resolve) => {
        httpsServer.on('error', (err) => {
          logger.warn(`HTTPS server error (port ${httpsPort}): ${err.message}`);
          resolve(null);
        });

        httpsServer.listen(httpsPort, '0.0.0.0', () => {
          logger.info(`✓ HTTPS Server running on https://localhost:${httpsPort}`);
          addresses.forEach(addr => {
            logger.info(`✓ Secure access: https://${addr}:${httpsPort}`);
          });
          logger.info('  → Use this URL in POS settings for HTTPS pages');
          logger.info('  → Visit the URL once in your browser to accept the certificate');
          resolve(httpsServer);
        });
      });
    } else {
      logger.warn('SSL certificate unavailable — HTTPS disabled');
    }
  } catch (err) {
    logger.warn(`HTTPS setup failed, continuing with HTTP only: ${err.message}`);
    logger.warn(err.stack);
  }

  return httpServer;
}

module.exports = { createServer, startAPIServer };
