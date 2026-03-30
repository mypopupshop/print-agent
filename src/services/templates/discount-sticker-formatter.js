/**
 * Discounted Sticker Label Formatter
 * Generates TSPL commands for product sticker labels with discount info
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
 * Format structured data into TSPL commands for a discounted sticker label
 */
function formatDiscountSticker(data) {
  const {
    product_name,
    description = '',
    size = '',
    price,
    offer_percentage,
    discounted_price,
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
  y += 6;

  // Product name — font 3, wraps up to 2 lines
  const nameLines = wrapText(product_name, maxChars('3'));
  for (let i = 0; i < Math.min(nameLines.length, 2); i++) {
    c.push(`TEXT ${M},${y},"3",0,1,1,"${nameLines[i]}"`);
    y += FONT_H['3'] + 2;
  }

  // Description — font 1, wraps up to 1 line (compact to save space)
  if (description) {
    const descLines = wrapText(description, maxChars('2'));
    c.push(`TEXT ${M},${y},"2",0,1,1,"${descLines[0]}"`);
    y += FONT_H['2'] + 2;
  }

  // Size — font 2
  if (size) {
    c.push(`TEXT ${M},${y},"2",0,1,1,"Size: ${size}"`);
    y += FONT_H['2'] + 2;
  }

  // Separator
  c.push(`BAR ${M},${y},${INNER_WIDTH},1`);
  y += 6;

  // --- Bottom: HStack<Barcode, VStack<MRP, discount%, price>> ---
  const bottomLimit = LABEL_HEIGHT - M;
  const barcodeH = Math.max(25, bottomLimit - y - 45);

  // Barcode — left side, human readable text below (same as non-discount)
  c.push(`BARCODE ${M},${y},"128",${barcodeH},1,0,2,3,"${barcode}"`);

  // Right column: VStack of MRP, discount%, discounted price — vertically centered with barcode
  const rightColX = LABEL_WIDTH - M;
  const stackH = FONT_H['2'] + 2 + FONT_H['3'] + 4 + FONT_H['3'];
  let ry = y + Math.floor(barcodeH / 2) - Math.floor(stackH / 2);

  // MRP with strikethrough — right-aligned
  const mrpStr = `MRP: Rs.${price}/-`;
  const mrpW = mrpStr.length * FONT_W['2'];
  c.push(`TEXT ${rightColX - mrpW},${ry},"2",0,1,1,"${mrpStr}"`);
  const strikeY = ry + Math.floor(FONT_H['2'] / 2);
  c.push(`BAR ${rightColX - mrpW},${strikeY},${mrpW},1`);
  ry += FONT_H['2'] + 2;

  // Offer percentage — highlighted with box, right-aligned
  const offerStr = `${offer_percentage}% OFF`;
  const offerW = offerStr.length * FONT_W['3'];
  const boxPad = 4;
  c.push(`BOX ${rightColX - offerW - boxPad},${ry - boxPad},${rightColX + boxPad},${ry + FONT_H['3'] + boxPad},2`);
  c.push(`TEXT ${rightColX - offerW},${ry},"3",0,1,1,"${offerStr}"`);
  ry += FONT_H['3'] + boxPad + 4;

  // Discounted price — font 3, right-aligned
  const discPriceStr = `Rs.${discounted_price}/-`;
  const discW = discPriceStr.length * FONT_W['3'];
  c.push(`TEXT ${rightColX - discW},${ry},"3",0,1,1,"${discPriceStr}"`);

  c.push('PRINT 1');
  c.push('');

  return c.join('\n');
}

module.exports = { formatDiscountSticker };
