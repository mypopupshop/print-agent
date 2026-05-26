const express = require('express');
const router = express.Router();
const printQueue = require('../../services/queue/print-queue');
const labelTemplates = require('../../services/templates/label-templates');
const { loadConfig } = require('../../config/config-loader');
const { getItemsWithFallback } = require('../../services/dbf-reader');
const logger = require('../../utils/logger');
const Joi = require('joi');

/**
 * GET /label/templates
 * Get all available label templates
 */
router.get('/label/templates', (req, res, next) => {
  try {
    logger.info('Label templates request received');

    const templates = labelTemplates.getTemplates();

    res.json({
      status: 'ok',
      templates
    });

  } catch (error) {
    logger.error('Get label templates error:', error);
    next(error);
  }
});

/**
 * GET /label/templates/:templateName
 * Get specific template details
 */
router.get('/label/templates/:templateName', (req, res, next) => {
  try {
    const { templateName } = req.params;
    logger.info(`Label template request: ${templateName}`);

    const template = labelTemplates.getTemplate(templateName);

    if (!template) {
      return res.status(404).json({
        status: 'error',
        error: 'TEMPLATE_NOT_FOUND',
        message: `Template "${templateName}" not found`,
        availableTemplates: Object.keys(labelTemplates.getTemplates())
      });
    }

    res.json({
      status: 'ok',
      template: {
        name: template.name,
        description: template.description,
        size: template.size,
        fields: template.fields
      }
    });

  } catch (error) {
    logger.error('Get label template error:', error);
    next(error);
  }
});

/**
 * GET /label/dbf/items
 * Read items from the configured DBF file and return a filtered/limited list
 * for the bulk-sticker picker. Re-reads on every request (no caching).
 *
 * Query: search (optional substring), limit (default 500, max 2000)
 */
router.get('/label/dbf/items', async (req, res, next) => {
  try {
    const search = (req.query.search || '').trim().toLowerCase();
    const limit = Math.min(
      parseInt(req.query.limit, 10) || 500,
      2000
    );

    const cfg = await loadConfig();
    const result = await getItemsWithFallback(cfg.dbfPath);

    const filtered = search
      ? result.items.filter(i =>
          i.itemCode.toLowerCase().includes(search) ||
          i.quality.toLowerCase().includes(search) ||
          i.ratesdesc.toLowerCase().includes(search) ||
          i.dimension.toLowerCase().includes(search)
        )
      : result.items;

    const truncated = filtered.length > limit;
    const payload = {
      status: 'ok',
      items: filtered.slice(0, limit),
      total: filtered.length,
      truncated,
      source: result.source
    };
    if (result.source === 'cache') {
      payload.cacheSavedAt = result.savedAt;
      payload.cacheSourcePath = result.sourcePath;
      payload.liveError = result.error;
    }
    res.json(payload);
  } catch (err) {
    if (err.code === 'DBF_PATH_NOT_CONFIGURED') {
      return res.status(400).json({
        status: 'error',
        error: 'DBF_PATH_NOT_CONFIGURED',
        message: 'DBF path is not configured. Set it in the Settings tab.'
      });
    }
    if (err.code === 'DBF_NOT_FOUND') {
      return res.status(404).json({
        status: 'error',
        error: 'DBF_NOT_FOUND',
        message: err.message
      });
    }
    if (err.code === 'DBF_INVALID') {
      return res.status(500).json({
        status: 'error',
        error: 'DBF_INVALID',
        message: err.message
      });
    }
    logger.error('GET /label/dbf/items error:', err);
    next(err);
  }
});

/**
 * POST /label
 * Print label using template
 */
router.post('/label', async (req, res, next) => {
  try {
    // Validation schema
    const schema = Joi.object({
      template: Joi.string().required(),
      data: Joi.object().required(),
      printer: Joi.string().optional(),
      copies: Joi.number().integer().min(1).max(100).default(1)
    });

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(d => d.message).join(', ');
      logger.warn(`Label validation failed: ${errors}`);

      return res.status(400).json({
        status: 'error',
        error: 'INVALID_REQUEST',
        message: errors
      });
    }

    const { template, data, printer, copies } = value;

    logger.info(`Label print request: template="${template}", copies=${copies}`);

    // Validate template data
    const validation = labelTemplates.validateTemplateData(template, data);

    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_TEMPLATE_DATA',
        message: validation.error || validation.errors.join(', '),
        requiredFields: validation.requiredFields,
        availableTemplates: validation.availableTemplates
      });
    }

    // Render template with data
    let tsplCommands;
    try {
      tsplCommands = labelTemplates.renderTemplate(template, data);
    } catch (renderError) {
      logger.error(`Template render error: ${renderError.message}`);
      return res.status(400).json({
        status: 'error',
        error: 'TEMPLATE_RENDER_FAILED',
        message: renderError.message
      });
    }

    // Handle multiple copies
    if (copies > 1) {
      // Modify TSPL command to print multiple copies
      tsplCommands = tsplCommands.replace(/PRINT 1/, `PRINT ${copies}`);
    }

    // Determine printer type
    const printerType = printer || 'tsc'; // Default to tsc label printer

    // Enqueue print job
    const result = await printQueue.enqueue(printerType, tsplCommands, {
      template,
      copies
    });

    logger.info(`Label print job enqueued: ${result.jobId}`);

    res.json({
      status: 'ok',
      jobId: result.jobId,
      template,
      copies,
      printer: printerType
    });

  } catch (error) {
    logger.error('Label print error:', error);

    if (error.message.includes('PRINTER_OFFLINE') || error.message.includes('PRINTER_NOT_FOUND')) {
      return res.json({
        status: 'offline',
        error: 'PRINTER_OFFLINE',
        message: 'Label printer is not connected or not found in system'
      });
    }

    next(error);
  }
});

module.exports = router;
