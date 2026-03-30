/**
 * Text wrapping utility for TSPL labels
 * Handles automatic word wrapping for long text fields
 */

/**
 * Wrap text to fit within a specified width
 * @param {string} text - Text to wrap
 * @param {number} maxCharsPerLine - Maximum characters per line
 * @returns {string[]} Array of wrapped lines
 */
function wrapText(text, maxCharsPerLine) {
  if (!text || text.length <= maxCharsPerLine) {
    return [text || ''];
  }

  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;

    if (testLine.length <= maxCharsPerLine) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }
      // If single word is too long, truncate it
      if (word.length > maxCharsPerLine) {
        lines.push(word.substring(0, maxCharsPerLine));
        currentLine = '';
      } else {
        currentLine = word;
      }
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generate TSPL commands for wrapped text
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {string} font - Font size
 * @param {string} text - Text to print
 * @param {number} maxWidth - Maximum width in characters
 * @param {number} lineHeight - Height between lines in dots
 * @returns {string} TSPL commands
 */
function generateWrappedTextCommands(x, y, font, text, maxWidth, lineHeight = 25) {
  const lines = wrapText(text, maxWidth);
  let commands = '';

  lines.forEach((line, index) => {
    const yPos = y + (index * lineHeight);
    commands += `TEXT ${x},${yPos},"${font}",0,1,1,"${line}"\n`;
  });

  return commands;
}

/**
 * Estimate character width for different font sizes
 * @param {string} font - Font size (1-8)
 * @returns {number} Characters that fit in 280 dots width
 */
function getMaxCharsForFont(font) {
  const fontWidths = {
    '1': 35,  // Small font
    '2': 28,  // Medium font
    '3': 20,  // Large font
    '4': 15,  // Extra large font
    '5': 12,  // XXL font
    '6': 10,
    '7': 8,
    '8': 6
  };

  return fontWidths[font] || 20;
}

module.exports = {
  wrapText,
  generateWrappedTextCommands,
  getMaxCharsForFont
};
