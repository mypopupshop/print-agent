const express = require('express');
const router = express.Router();
const Joi = require('joi');
const { loadConfig, saveConfig } = require('../../config/config-loader');
const logger = require('../../utils/logger');

const updateSchema = Joi.object({
  dbfPath: Joi.string().allow('')
}).min(1);

/**
 * GET /config - return the current persisted config (safe subset).
 * Reads from disk so freshly-saved values are reflected.
 */
router.get('/config', async (req, res, next) => {
  try {
    const cfg = await loadConfig();
    res.json({
      status: 'ok',
      config: {
        dbfPath: cfg.dbfPath || '',
        port: cfg.port,
        epson: cfg.epson,
        tsc: cfg.tsc,
        a4: cfg.a4
      }
    });
  } catch (err) {
    logger.error('GET /config error:', err);
    next(err);
  }
});

/**
 * PUT /config - update a whitelisted subset of config values.
 * Currently only `dbfPath` is settable from the dashboard.
 */
router.put('/config', async (req, res, next) => {
  try {
    const { error, value } = updateSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    if (error) {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_REQUEST',
        message: error.details.map(d => d.message).join(', ')
      });
    }

    const merged = await saveConfig(value);
    res.json({
      status: 'ok',
      config: {
        dbfPath: merged.dbfPath || '',
        port: merged.port,
        epson: merged.epson,
        tsc: merged.tsc,
        a4: merged.a4
      }
    });
  } catch (err) {
    logger.error('PUT /config error:', err);
    next(err);
  }
});

module.exports = router;
