/**
 * Sticker Label Formatter
 * Generates TSPL commands from structured JSON for product sticker labels
 * Designed for TSC TTP-244 Pro — 60mm x 40mm labels (480 x 320 dots at 8 dots/mm)
 */

const { wrapText } = require('./text-wrapper');

// 60mm x 40mm at 8 dots/mm
const LABEL_WIDTH = 480;
const LABEL_HEIGHT = 320;
const M = 15; // margin in dots
const INNER_WIDTH = LABEL_WIDTH - M * 2; // 450

// TSPL built-in font character widths (dots)
const FONT_W = { '1': 8, '2': 12, '3': 16, '4': 24 };
const FONT_H = { '1': 12, '2': 20, '3': 24, '4': 32 };

function maxChars(font) {
  return Math.floor(INNER_WIDTH / FONT_W[font]);
}

function centerX(text, font) {
  const textW = text.length * FONT_W[font];
  return Math.max(M, Math.floor((LABEL_WIDTH - textW) / 2));
}

/**
 * Format structured data into TSPL commands for a sticker label
 */
function formatSticker(data) {
  const {
    product_name,
    description = '',
    size = '',
    price,
    company_name = 'M/s RISHABH BOMBAY DYEING',
    company_description = 'Habsiguda, Hyderabad',
    barcode
  } = data;

  const c = [];
  let y = 10;

  // --- Header ---
  c.push('SIZE 60 mm, 40 mm');
  c.push('GAP 2 mm, 0 mm');
  c.push('DIRECTION 0');
  c.push('OFFSET 0 mm');
  c.push('CLS');

  // Border
  c.push(`BOX 5,5,${LABEL_WIDTH - 5},${LABEL_HEIGHT - 5},2`);

  // Company name — font 3, centered
  const compName = company_name.substring(0, maxChars('3'));
  c.push(`TEXT ${centerX(compName, '3')},${y},"3",0,1,1,"${compName}"`);
  y += FONT_H['3'] + 2;

  // Company description — font 2, centered
  if (company_description) {
    const compDesc = company_description.substring(0, maxChars('2'));
    c.push(`TEXT ${centerX(compDesc, '2')},${y},"2",0,1,1,"${compDesc}"`);
    y += FONT_H['2'] + 4;
  }

  // Separator
  c.push(`BAR ${M},${y},${INNER_WIDTH},1`);
  y += 8;

  // Product name — font 3 (medium), wraps up to 2 lines
  const nameLines = wrapText(product_name, maxChars('3'));
  for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
    c.push(`TEXT ${M},${y},"3",0,1,1,"${nameLines[i]}"`);
    y += FONT_H['3'] + 4;
  }

  // Description — font 2, wraps up to 2 lines
  if (description) {
    const descLines = wrapText(description, maxChars('2'));
    for (let i = 0; i < Math.min(descLines.length, 2); i++) {
      c.push(`TEXT ${M},${y},"2",0,1,1,"${descLines[i]}"`);
      y += FONT_H['2'] + 2;
    }
  }

  // Size — font 2
  if (size) {
    c.push(`TEXT ${M},${y},"2",0,1,1,"Size: ${size}"`);
    y += FONT_H['2'] + 4;
  }

  // Separator
  c.push(`BAR ${M},${y},${INNER_WIDTH},1`);
  y += 6;

  // --- Bottom: Barcode (left) + Price (right) ---
  // Hard bottom limit: border is at y=315, keep content within y=305
  const bottomLimit = LABEL_HEIGHT - M;
  const barcodeH = Math.max(25, bottomLimit - y - 45);

  // Barcode — left side, human readable text below
  c.push(`BARCODE ${M},${y},"128",${barcodeH},1,0,2,3,"${barcode}"`);

  // Price — font 3, right-aligned, vertically centered with barcode
  const priceStr = `Rs.${price}/-`;
  const priceW = priceStr.length * FONT_W['3'];
  const priceX = LABEL_WIDTH - M - priceW;
  const priceY = y + Math.floor(barcodeH / 2) - Math.floor(FONT_H['3'] / 2);
  c.push(`TEXT ${priceX},${priceY},"3",0,1,1,"${priceStr}"`);

  c.push('PRINT 1');
  c.push('');

  return c.join('\n');
}

module.exports = { formatSticker };
