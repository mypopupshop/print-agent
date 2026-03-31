const express = require('express');
const router = express.Router();
const printerPool = require('../../services/printers/printer-pool');
const printQueue = require('../../services/queue/print-queue');
const logger = require('../../utils/logger');

/**
 * GET /printers
 * Get list of all configured printers with their status
 */
router.get('/printers', async (req, res, next) => {
  try {
    logger.info('Printers list request received');

    // Get all printers from pool
    const printers = await printerPool.getAllPrinters();

    // Get queue status
    const queueStatus = printQueue.getStatus();
    const queueStats = printQueue.getStats();

    res.json({
      status: 'ok',
      printers,
      queue: {
        ...queueStatus,
        stats: queueStats
      }
    });

  } catch (error) {
    logger.error('Get printers error:', error);
    next(error);
  }
});

/**
 * GET /status
 * Get detailed system status
 */
router.get('/status', async (req, res, next) => {
  try {
    const printers = await printerPool.getAllPrinters();
    const queueStatus = printQueue.getStatus();
    const queueStats = printQueue.getStats();

    res.json({
      status: 'ok',
      uptime: process.uptime(),
      printers: {
        total: printers.length,
        online: printers.filter(p => p.online).length,
        list: printers
      },
      queue: {
        ...queueStatus,
        ...queueStats
      }
    });

  } catch (error) {
    logger.error('Get status error:', error);
    next(error);
  }
});

/**
 * GET /jobs
 * Get recent print jobs history
 */
router.get('/jobs', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const jobs = printQueue.getRecentJobs(limit);

    res.json({
      status: 'ok',
      jobs
    });

  } catch (error) {
    logger.error('Get jobs error:', error);
    next(error);
  }
});

/**
 * GET /network-info
 * Get network addresses other devices can use to connect
 */
router.get('/network-info', (req, res) => {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, address: iface.address });
      }
    }
  }

  const port = req.socket.localPort;
  const urls = addresses.map(a => `http://${a.address}:${port}`);

  res.json({
    status: 'ok',
    port,
    addresses,
    urls,
    localhost: `http://localhost:${port}`
  });
});

module.exports = router;
