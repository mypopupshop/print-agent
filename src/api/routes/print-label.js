const express = require('express');
const router = express.Router();
const printQueue = require('../../services/queue/print-queue');
const logger = require('../../utils/logger');
const { validate } = require('../middleware/validator');

/**
 * POST /print/label
 * Print TSPL/ZPL commands to TSC label printer
 */
router.post('/print/label', validate('label'), async (req, res, next) => {
  try {
    const { data } = req.body;

    logger.info('Label print request received');

    // Enqueue print job (non-blocking)
    const result = await printQueue.enqueue('tsc', data);

    res.json(result);

  } catch (error) {
    logger.error('Label print error:', error);

    // Check for specific error types
    if (error.message.includes('PRINTER_OFFLINE') || error.message.includes('PRINTER_NOT_FOUND')) {
      return res.json({
        status: 'offline',
        error: 'PRINTER_OFFLINE',
        message: 'TSC label printer is not connected or not found in system'
      });
    }

    next(error);
  }
});

module.exports = router;
