const Joi = require('joi');
const logger = require('../../utils/logger');

/**
 * Structured receipt schema for formatted sale receipts
 */
const structuredReceiptSchema = Joi.object({
  type: Joi.string().valid('structured').required(),
  paperWidth: Joi.number().integer().valid(42, 48).default(48),
  store: Joi.object({
    name: Joi.string().max(48).required(),
    address: Joi.string().max(96),
    phone: Joi.string().max(20),
    gstin: Joi.string().max(20),
    email: Joi.string().max(48),
    logoUrl: Joi.string().uri().max(512).allow('', null)
  }),
  invoice: Joi.object({
    number: Joi.string().max(30),
    date: Joi.string(),
    time: Joi.string(),
    cashier: Joi.string().max(30),
    paymentMethod: Joi.string().max(20)
  }),
  customer: Joi.object({
    name: Joi.string().max(48),
    phone: Joi.string().max(20)
  }),
  items: Joi.array().items(Joi.object({
    name: Joi.string().max(96).required(),
    variant: Joi.string().max(96),
    customisation: Joi.string().max(96),
    quantity: Joi.number().positive().required(),
    unitPrice: Joi.number().min(0),
    discount: Joi.number().min(0).default(0),
    total: Joi.number().min(0).required()
  })).min(1).required(),
  summary: Joi.object({
    subtotal: Joi.number().min(0),
    discount: Joi.number().min(0).default(0),
    taxLabel: Joi.string().max(10).default('Tax'),
    taxPercent: Joi.number().min(0),
    taxAmount: Joi.number().min(0).default(0),
    shipping: Joi.number().min(0).default(0),
    roundOff: Joi.number().default(0),
    total: Joi.number().min(0).required(),
    amountPaid: Joi.number().min(0),
    change: Joi.number().min(0)
  }),
  footer: Joi.object({
    message: Joi.string().max(96),
    returnPolicy: Joi.string().max(96),
    website: Joi.string().max(48),
    brandLogoUrl: Joi.string().uri().max(512).allow('', null)
  })
});

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  receipt: Joi.object({
    data: Joi.alternatives().try(
      Joi.string(),
      Joi.binary(),
      structuredReceiptSchema,
      Joi.object({ raw: Joi.string().required() })
    ).required()
  }),

  label: Joi.object({
    data: Joi.alternatives().try(
      Joi.string(),
      Joi.binary(),
      Joi.object()
    ).required()
  }),

  sticker: Joi.object({
    product_name: Joi.string().max(60).required(),
    description: Joi.string().max(120).allow('', null).default(''),
    size: Joi.string().max(20).allow('', null).default(''),
    price: Joi.alternatives().try(
      Joi.string().max(10),
      Joi.number()
    ).required(),
    company_name: Joi.string().max(40).default('M/s RISHABH BOMBAY DYEING'),
    company_description: Joi.string().max(50).default('Habsiguda, Hyderabad'),
    barcode: Joi.string().max(20).required(),
    copies: Joi.number().integer().min(1).max(100).default(1),
    printer: Joi.string().optional()
  }),

  'discount-sticker': Joi.object({
    product_name: Joi.string().max(60).required(),
    description: Joi.string().max(120).allow('', null).default(''),
    size: Joi.string().max(20).allow('', null).default(''),
    price: Joi.alternatives().try(
      Joi.string().max(10),
      Joi.number()
    ).required(),
    offer_percentage: Joi.alternatives().try(
      Joi.string().max(3),
      Joi.number().min(1).max(99)
    ).required(),
    discounted_price: Joi.alternatives().try(
      Joi.string().max(10),
      Joi.number()
    ).required(),
    company_name: Joi.string().max(40).default('M/s RISHABH BOMBAY DYEING'),
    company_description: Joi.string().max(50).default('Habsiguda, Hyderabad'),
    barcode: Joi.string().max(20).required(),
    copies: Joi.number().integer().min(1).max(100).default(1),
    printer: Joi.string().optional()
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
