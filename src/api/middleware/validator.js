const Joi = require('joi');
const logger = require('../../utils/logger');
const { CODE128_PATTERN } = require('../../utils/barcode');

/**
 * Structured receipt schema for formatted sale receipts
 */
const structuredReceiptSchema = Joi.object({
  type: Joi.string().valid('structured').required(),
  paperWidth: Joi.number().integer().valid(42, 48).default(48),
  store: Joi.object({
    // Sized for GST sales_invoice snapshots: legal names and registered
    // addresses routinely exceed the old 48/96 caps and the thermal
    // formatter word-wraps them, so bound generously rather than reject.
    name: Joi.string().max(120).required(),
    address: Joi.string().max(200),
    phone: Joi.string().max(24),
    gstin: Joi.string().max(20),
    email: Joi.string().max(96),
    logoUrl: Joi.string().uri().max(512).allow('', null)
  }),
  invoice: Joi.object({
    number: Joi.string().max(30),
    date: Joi.string(),
    time: Joi.string(),
    cashier: Joi.string().max(30),
    paymentMethod: Joi.string().max(24),
    // GST sales-invoice header (design §6). Their presence switches the
    // receipt formatter to the GST layout; absent → legacy sale receipt.
    documentType: Joi.string().valid('tax_invoice', 'bill_of_supply'),
    documentTitle: Joi.string().max(30),
    placeOfSupply: Joi.string().max(64),
    supplyType: Joi.string().valid('intra_state', 'inter_state'),
    channel: Joi.string().max(24),
    ref: Joi.string().max(40)
  }),
  customer: Joi.object({
    name: Joi.string().max(120),
    phone: Joi.string().max(20)
  }),
  items: Joi.array().items(Joi.object({
    name: Joi.string().max(150).required(),
    variant: Joi.string().max(120),
    customisation: Joi.string().max(120),
    quantity: Joi.number().positive().required(),
    unitPrice: Joi.number().min(0),
    discount: Joi.number().min(0).default(0),
    total: Joi.number().min(0).required(),
    // Per-line GST snapshot (design §3.2). Rendered as-is; never recomputed.
    hsn: Joi.string().max(12).allow('', null),
    gstRate: Joi.number().min(0),
    taxableValue: Joi.number().min(0),
    cgstAmount: Joi.number().min(0),
    sgstAmount: Joi.number().min(0),
    igstAmount: Joi.number().min(0),
    taxAmount: Joi.number().min(0)
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
    change: Joi.number().min(0),
    // GST totals (snapshotted on the sales_invoices row).
    taxableValue: Joi.number().min(0),
    cgst: Joi.number().min(0),
    sgst: Joi.number().min(0),
    igst: Joi.number().min(0),
    totalTax: Joi.number().min(0),
    collectTax: Joi.boolean()
  }),
  // Mandatory composition-scheme declaration (design §6); printed in a box.
  declaration: Joi.string().max(160),
  // Optional verify/UPI QR — renders a native ESC/POS QR when supplied.
  qr: Joi.object({
    url: Joi.string().max(256).required(),
    upi: Joi.string().max(64),
    label: Joi.string().max(64)
  }),
  footer: Joi.object({
    message: Joi.string().max(96),
    returnPolicy: Joi.string().max(96),
    website: Joi.string().max(48),
    brandLogoUrl: Joi.string().uri().max(512).allow('', null)
  })
});

/**
 * HTML receipt payload (web POS pre-renders the receipt and ships HTML).
 * Lives at the top level (not under `data`) per the contract with the POS.
 */
const htmlReceiptSchema = Joi.object({
  type: Joi.string().valid('html').required(),
  // 2MB upper bound — receipts with embedded base64 logos can be large but
  // anything beyond this is almost certainly a malformed payload.
  html: Joi.string().min(1).max(2 * 1024 * 1024).required(),
  // Width must match one of the supported thermal-head dot widths.
  width: Joi.number().integer().valid(384, 512, 576, 832).optional()
});

/**
 * Validation schemas for different endpoints
 */
const schemas = {
  receipt: Joi.alternatives().try(
    htmlReceiptSchema,
    Joi.object({
      data: Joi.alternatives().try(
        Joi.string(),
        Joi.binary(),
        structuredReceiptSchema,
        Joi.object({ raw: Joi.string().required() })
      ).required()
    })
  ),

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
    barcode: Joi.string().max(48).pattern(CODE128_PATTERN).required()
      .messages({ 'string.pattern.base': 'Barcode must contain only printable ASCII characters (Code 128), no double-quotes' }),
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
    barcode: Joi.string().max(48).pattern(CODE128_PATTERN).required()
      .messages({ 'string.pattern.base': 'Barcode must contain only printable ASCII characters (Code 128), no double-quotes' }),
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
      let details = error.details;
      // alternatives().try() reports only a generic "does not match any of
      // the allowed types" and swallows the inner schema's field errors. For
      // a structured receipt, re-validate against the structured schema so the
      // response names the offending field (e.g. store.address too long).
      const d = req.body && req.body.data;
      if (schemaName === 'receipt' && d && typeof d === 'object' && d.type === 'structured') {
        const inner = structuredReceiptSchema.validate(d, { abortEarly: false, stripUnknown: true });
        if (inner.error) {
          details = inner.error.details.map(x => ({ ...x, message: `data.${x.message}` }));
        }
      } else if (schemaName === 'receipt' && req.body && req.body.type === 'html') {
        // Same idea for the html payload — surface "html is required" etc.
        const inner = htmlReceiptSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
        if (inner.error) {
          details = inner.error.details;
        }
      }
      const errors = details.map(d => d.message).join(', ');
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

module.exports = { validate, schemas, structuredReceiptSchema };
