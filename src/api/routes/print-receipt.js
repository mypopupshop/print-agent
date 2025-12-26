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
    const { data } = req.body;

    logger.info('Receipt print request received');

    // Enqueue print job (non-blocking)
    const result = await printQueue.enqueue('epson', data);

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
