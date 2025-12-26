const Joi = require('joi');
const logger = require('../../utils/logger');

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  receipt: Joi.object({
    data: Joi.alternatives().try(
      Joi.string(),
      Joi.binary(),
      Joi.object()
    ).required()
  }),

  label: Joi.object({
    data: Joi.alternatives().try(
      Joi.string(),
      Joi.binary(),
      Joi.object()
    ).required()
  }),

  a4: Joi.object({
    type: Joi.string().valid('pdf', 'html').when('url', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    content: Joi.string().when('url', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    }),
    pdfBase64: Joi.string().optional(),
    htmlContent: Joi.string().optional(),
    url: Joi.string().uri().optional(),
    options: Joi.object({
      format: Joi.string().default('A4'),
      orientation: Joi.string().valid('portrait', 'landscape').default('portrait'),
      margin: Joi.object({
        top: Joi.string(),
        right: Joi.string(),
        bottom: Joi.string(),
        left: Joi.string()
      }).optional()
    }).optional(),
    paperSize: Joi.string().optional(),
    scale: Joi.string().optional(),
    orientation: Joi.string().valid('portrait', 'landscape').optional()
  })
};

/**
 * Create validation middleware for a specific schema
 * @param {string} schemaName - Name of schema to use
 * @returns {Function} Express middleware function
 */
function validate(schemaName) {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      logger.error(`Validation schema "${schemaName}" not found`);
      return next();
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(d => d.message).join(', ');
      logger.warn(`Validation failed: ${errors}`);

      return res.status(400).json({
        status: 'error',
        error: 'INVALID_REQUEST',
        message: errors
      });
    }

    // Replace body with validated value
    req.body = value;
    next();
  };
}

module.exports = { validate };
