const express = require('express');
const router = express.Router();
const printQueue = require('../../services/queue/print-queue');
const logger = require('../../utils/logger');
const { validate } = require('../middleware/validator');

/**
 * POST /print/a4
 * Print PDF or HTML to A4 printer
 */
router.post('/print/a4', validate('a4'), async (req, res, next) => {
  try {
    const data = req.body;

    logger.info(`A4 print request received (type: ${data.type || 'pdf'})`);

    // Enqueue print job (non-blocking)
    const result = await printQueue.enqueue('a4', data);

    res.json(result);

  } catch (error) {
    logger.error('A4 print error:', error);

    // Check for specific error types
    if (error.message.includes('PRINTER_OFFLINE')) {
      return res.json({
        status: 'offline',
        error: 'PRINTER_OFFLINE',
        message: 'A4 printer is not connected or powered off'
      });
    }

    next(error);
  }
});

module.exports = router;
