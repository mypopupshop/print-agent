const { nanoid } = require('nanoid');

/**
 * Generate a unique job ID
 * Format: {timestamp}-{random}
 * Example: 1703012345678-abc123def
 */
function generateJobId() {
  const timestamp = Date.now();
  const random = nanoid(8);
  return `${timestamp}-${random}`;
}

module.exports = { generateJobId };
