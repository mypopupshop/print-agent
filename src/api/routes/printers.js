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
        stats: queueStats
      }
    });

  } catch (error) {
    logger.error('Get status error:', error);
    next(error);
  }
});

module.exports = router;
