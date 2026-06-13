const express = require('express');
const router = express.Router();
const printQueue = require('../../services/queue/print-queue');
const logger = require('../../utils/logger');
const { validate } = require('../middleware/validator');

/**
 * POST /print/receipt
 * Print ESC/POS commands to Epson thermal printer
 */
router.post('/print/receipt', validate('receipt'), async (req, res, next) => {
  try {
    // Two payload shapes are accepted (see validator.js):
    //   { type: 'html', html, width? }   ← web POS pre-renders the receipt
    //   { data: <string|structured|raw|binary> }  ← legacy callers
    // Both ultimately become the `data` argument passed to ESCPOSPrinter.print().
    let jobData;
    if (req.body && req.body.type === 'html') {
      jobData = { type: 'html', html: req.body.html, width: req.body.width };
      logger.info(`Receipt print request received (html, ${req.body.html.length}B)`);
    } else {
      jobData = req.body.data;
      logger.info('Receipt print request received');
    }

    // Enqueue print job (non-blocking)
    const result = await printQueue.enqueue('epson', jobData);

    res.json(result);

  } catch (error) {
    logger.error('Receipt print error:', error);

    // Check for specific error types
    if (error.message.includes('PRINTER_OFFLINE')) {
      return res.json({
        status: 'offline',
        error: 'PRINTER_OFFLINE',
        message: 'Epson printer is not connected or powered off'
      });
    }

    next(error);
  }
});

module.exports = router;
