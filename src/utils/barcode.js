/**
 * Code 128 Barcode Utilities
 * Validation and sanitization for Code 128 barcode data used in TSPL commands.
 *
 * Code 128 supports ASCII 0–127 but TSPL embeds the value inside double-quoted
 * strings, so we restrict to printable ASCII (32–126) excluding the double-quote
 * character (34) which would break the TSPL command syntax.
 */

// Printable ASCII range valid for Code 128 inside TSPL strings
const CODE128_PATTERN = /^[\x20-\x21\x23-\x7e]+$/; // space(0x20)–!(0x21), #(0x23)–~(0x7e)

/**
 * Validate that a string is a legal Code 128 barcode value for TSPL.
 * @param {string} value - Barcode data to validate
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateCode128(value) {
  if (typeof value !== 'string' || value.length === 0) {
    return { valid: false, reason: 'Barcode must be a non-empty string' };
  }
  if (value.length > 48) {
    return { valid: false, reason: 'Barcode exceeds maximum length of 48 characters for Code 128' };
  }
  if (!CODE128_PATTERN.test(value)) {
    return { valid: false, reason: 'Barcode contains characters not allowed in Code 128 (printable ASCII only, no double-quotes)' };
  }
  return { valid: true };
}

/**
 * Sanitize a barcode string for safe embedding in a TSPL BARCODE command.
 * Strips any characters outside the valid Code 128 / TSPL range.
 * @param {string} value
 * @returns {string}
 */
function sanitizeCode128(value) {
  return String(value).replace(/[^\x20-\x21\x23-\x7e]/g, '');
}

module.exports = { validateCode128, sanitizeCode128, CODE128_PATTERN };
