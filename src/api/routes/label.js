const express = require('express');
const router = express.Router();
const printQueue = require('../../services/queue/print-queue');
const labelTemplates = require('../../services/templates/label-templates');
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
