const express = require('express');
const router = express.Router();
const printQueue = require('../../services/queue/print-queue');
const { formatSticker } = require('../../services/templates/sticker-formatter');
const logger = require('../../utils/logger');
const { validate } = require('../middleware/validator');

/**
 * POST /print/sticker
 * Print sticker label from structured JSON to TSC label printer
 */
router.post('/print/sticker', validate('sticker'), async (req, res, next) => {
  try {
    const data = req.body;
    const { copies = 1, printer } = data;

    logger.info(`Sticker print request: product="${data.product_name}", copies=${copies}`);

    // Generate TSPL commands from structured JSON
    let tsplCommands = formatSticker(data);

    // Handle multiple copies
    if (copies > 1) {
      tsplCommands = tsplCommands.replace(/PRINT 1/, `PRINT ${copies}`);
    }

    // Enqueue to TSC printer
    const printerType = printer || 'tsc';
    const result = await printQueue.enqueue(printerType, tsplCommands, {
      type: 'sticker',
      copies
    });

    logger.info(`Sticker print job enqueued: ${result.jobId}`);

    res.json({
      status: 'ok',
      jobId: result.jobId,
      copies,
      printer: printerType
    });

  } catch (error) {
    logger.error('Sticker print error:', error);

    if (error.message.includes('PRINTER_OFFLINE') || error.message.includes('PRINTER_NOT_FOUND')) {
      return res.json({
        status: 'offline',
        error: 'PRINTER_OFFLINE',
        message: 'TSC label printer is not connected or not found'
      });
    }

    next(error);
  }
});

module.exports = router;
