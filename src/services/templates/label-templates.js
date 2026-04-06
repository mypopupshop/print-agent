/**
 * Label Template System
 * Predefined TSPL templates with dynamic field replacement
 */

const { wrapText, getMaxCharsForFont } = require('./text-wrapper');
const { sanitizeCode128 } = require('../../utils/barcode');

/**
 * Label templates in TSPL format
 * Use {{fieldName}} for dynamic placeholders
 */
const templates = {
  product_label: {
    name: 'Product Label',
    description: 'M/s Rishabh Bombay Dyeing - Regular product label 60mm x 40mm',
    size: { width: 60, height: 40 },
    fields: ['product_name', 'product_type', 'size', 'barcode', 'price'],
    template: `SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
DIRECTION 0
OFFSET 0 mm
CLS

BOX 5,5,470,310,2

TEXT 120,12,"2",0,1,1,"M/s RISHABH BOMBAY DYEING"
TEXT 120,35,"1",0,1,1,"Habsiguda, Hyderabad"

TEXT 15,65,"4",0,1,2,"{{product_name}}"
TEXT 320,75,"2",0,1,1,"{{size}}"

TEXT 15,115,"2",0,1,1,"{{product_type}}"

BARCODE 15,155,"128",75,1,0,2,2,"{{barcode}}"

TEXT 310,220,"4",0,2,2,"Rs. {{price}}/-"

PRINT 1
`
  },

  discounted_product_label: {
    name: 'Discounted Product Label',
    description: 'M/s Rishabh Bombay Dyeing - Discounted product label with discount badge 60mm x 40mm',
    size: { width: 60, height: 40 },
    fields: ['product_name', 'product_type', 'size', 'barcode', 'original_price', 'discounted_price', 'discount_percent'],
    template: `SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
DIRECTION 0
OFFSET 0 mm
CLS

BOX 5,5,470,310,2

TEXT 120,12,"2",0,1,1,"M/s RISHABH BOMBAY DYEING"
TEXT 120,35,"1",0,1,1,"Habsiguda, Hyderabad"

BOX 395,10,460,50,2
TEXT 405,23,"2",0,1,1,"{{discount_percent}}%"

TEXT 15,65,"4",0,1,2,"{{product_name}}"
TEXT 270,75,"2",0,1,1,"{{size}}"

TEXT 15,115,"2",0,1,1,"{{product_type}}"

BARCODE 15,155,"128",75,1,0,2,2,"{{barcode}}"

TEXT 285,175,"2",0,1,1,"Rs. {{original_price}}/-"
BAR 285,190,160,2
TEXT 285,205,"4",0,2,2,"Rs. {{discounted_price}}/-"

PRINT 1
`
  }
};

/**
 * Get all available templates
 * @returns {Object} Templates metadata
 */
function getTemplates() {
  const templateList = {};

  Object.keys(templates).forEach(key => {
    templateList[key] = {
      name: templates[key].name,
      description: templates[key].description,
      size: templates[key].size,
      fields: templates[key].fields
    };
  });

  return templateList;
}

/**
 * Get a specific template
 * @param {string} templateName - Template identifier
 * @returns {Object|null} Template object or null if not found
 */
function getTemplate(templateName) {
  return templates[templateName] || null;
}

/**
 * Render a template with dynamic data
 * @param {string} templateName - Template identifier
 * @param {Object} data - Data to fill into template
 * @returns {string} Rendered TSPL commands
 */
function renderTemplate(templateName, data = {}) {
  const template = templates[templateName];

  if (!template) {
    throw new Error(`Template "${templateName}" not found`);
  }

  // Replace placeholders with actual data
  let rendered = template.template;

  // Check for missing required fields
  const missingFields = [];
  template.fields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }

  // Handle text wrapping for long fields
  const wrappedData = {};
  Object.keys(data).forEach(key => {
    let value = String(data[key]);

    // Apply wrapping for product_name and product_type
    if (key === 'product_name' && value.length > 15) {
      const lines = wrapText(value, 15);
      wrappedData[key] = lines[0]; // Use first line only for now
      if (lines.length > 1) {
        wrappedData[key + '_line2'] = lines[1];
      }
    } else if (key === 'product_type' && value.length > 28) {
      const lines = wrapText(value, 28);
      wrappedData[key] = lines[0];
      if (lines.length > 1) {
        wrappedData[key + '_line2'] = lines[1];
      }
    } else if (key === 'barcode') {
      wrappedData[key] = sanitizeCode128(value);
    } else {
      wrappedData[key] = value;
    }
  });

  // Replace all placeholders
  Object.keys(wrappedData).forEach(key => {
    const placeholder = `{{${key}}}`;
    const value = wrappedData[key];
    rendered = rendered.split(placeholder).join(value);
  });

  // Remove any unreplaced optional placeholders (like _line2 if not needed)
  rendered = rendered.replace(/\{\{[^}]+\}\}/g, '');

  return rendered;
}

/**
 * Validate template data
 * @param {string} templateName - Template identifier
 * @param {Object} data - Data to validate
 * @returns {Object} Validation result
 */
function validateTemplateData(templateName, data) {
  const template = templates[templateName];

  if (!template) {
    return {
      valid: false,
      error: `Template "${templateName}" not found`,
      availableTemplates: Object.keys(templates)
    };
  }

  const errors = [];
  const missingFields = [];

  // Check required fields
  template.fields.forEach(field => {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      missingFields.push(field);
    }
  });

  if (missingFields.length > 0) {
    errors.push(`Missing required fields: ${missingFields.join(', ')}`);
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      requiredFields: template.fields
    };
  }

  return {
    valid: true,
    message: 'Template data is valid'
  };
}

module.exports = {
  getTemplates,
  getTemplate,
  renderTemplate,
  validateTemplateData
};
