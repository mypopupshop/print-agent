const { wrapText } = require('./text-wrapper');
const { urlToEscposImage } = require('./image-printer');

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

class ReceiptBuilder {
  constructor(paperWidth = 48) {
    this.width = paperWidth;
    this.bytes = [];
  }

  initialize() {
    this.bytes.push(ESC, 0x40); // ESC @ - reset printer
    return this;
  }

  newline(count = 1) {
    for (let i = 0; i < count; i++) {
      this.bytes.push(LF);
    }
    return this;
  }

  text(str) {
    const buf = Buffer.from(str, 'utf-8');
    this.bytes.push(...buf);
    return this;
  }

  textLine(str) {
    return this.text(str).newline();
  }

  bold(on) {
    this.bytes.push(ESC, 0x45, on ? 0x01 : 0x00);
    return this;
  }

  // White-on-black reverse video (GS B n). Used for the GST document-type band.
  reverseVideo(on) {
    this.bytes.push(GS, 0x42, on ? 0x01 : 0x00);
    return this;
  }

  alignLeft() {
    this.bytes.push(ESC, 0x61, 0x00);
    return this;
  }

  alignCenter() {
    this.bytes.push(ESC, 0x61, 0x01);
    return this;
  }

  alignRight() {
    this.bytes.push(ESC, 0x61, 0x02);
    return this;
  }

  doubleHeight(on) {
    this.bytes.push(GS, 0x21, on ? 0x01 : 0x00);
    return this;
  }

  normalSize() {
    this.bytes.push(GS, 0x21, 0x00);
    return this;
  }

  /**
   * Native ESC/POS QR code (GS ( k, model 2). Renders a real scannable code
   * instead of a rasterised image — sharp at 203dpi and tiny on the wire.
   * @param {string} data       payload to encode (e.g. the verify URL)
   * @param {number} moduleSize 1-16 dot size per module (default 6)
   * @param {number} ecLevel    0x30 L · 0x31 M · 0x32 Q · 0x33 H
   */
  qrCode(data, moduleSize = 6, ecLevel = 0x31) {
    const payload = Buffer.from(data, 'utf-8');
    const len = payload.length + 3;
    const pL = len & 0xff;
    const pH = (len >> 8) & 0xff;
    // Select model 2
    this.bytes.push(GS, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00);
    // Module size
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, moduleSize);
    // Error correction level
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, ecLevel);
    // Store the data in the symbol storage area
    this.bytes.push(GS, 0x28, 0x6b, pL, pH, 0x31, 0x50, 0x30, ...payload);
    // Print the symbol
    this.bytes.push(GS, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30);
    return this;
  }

  separator(char = '-') {
    this.textLine(char.repeat(this.width));
    return this;
  }

  // Print left-aligned text and right-aligned text on the same line
  leftRight(left, right) {
    const gap = this.width - left.length - right.length;
    if (gap < 1) {
      this.textLine(left);
      this.textLine(right.padStart(this.width));
    } else {
      this.textLine(left + ' '.repeat(gap) + right);
    }
    return this;
  }

  // Center a string manually (for use with left-align mode too)
  centerText(str) {
    if (str.length >= this.width) {
      this.textLine(str.substring(0, this.width));
    } else {
      const pad = Math.floor((this.width - str.length) / 2);
      this.textLine(' '.repeat(pad) + str);
    }
    return this;
  }

  /**
   * Full-width inverted band with centred, lightly letter-spaced text —
   * the thermal stand-in for the design's solid-ink document-type block.
   */
  invertedBand(title) {
    let text = title.split('').join(' '); // letter-spacing
    if (text.length > this.width - 2) text = title; // too wide spaced → plain
    const padLeft = Math.max(0, Math.floor((this.width - text.length) / 2));
    const padRight = Math.max(0, this.width - padLeft - text.length);
    const line = ' '.repeat(padLeft) + text + ' '.repeat(padRight);
    this.alignLeft().reverseVideo(true).bold(true);
    this.textLine(line);
    this.bold(false).reverseVideo(false);
    return this;
  }

  /** Centred text inside an ASCII frame — the declaration callout. */
  boxedText(text) {
    const w = this.width;
    const inner = w - 4; // "| " + content + " |"
    const lines = wrapText(text, inner);
    this.alignLeft();
    this.textLine('+' + '-'.repeat(w - 2) + '+');
    lines.forEach((l) => {
      const slack = inner - l.length;
      const left = Math.floor(slack / 2);
      this.textLine('| ' + ' '.repeat(left) + l + ' '.repeat(slack - left) + ' |');
    });
    this.textLine('+' + '-'.repeat(w - 2) + '+');
    return this;
  }

  feedAndCut(feedLines = 4) {
    this.newline(feedLines);
    this.bytes.push(GS, 0x56, 0x01); // GS V 1 - partial cut
    return this;
  }

  build() {
    return Buffer.from(this.bytes);
  }
}

function formatMoney(num) {
  return Number(num).toFixed(2);
}

// Indian-grouped money, no symbol: 4896 → "4,896.00". Matches the design's inr().
function inr(num, decimals = 2) {
  return Number(num).toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function r2(n) {
  return Math.round(n * 100) / 100;
}

/**
 * Replace characters that aren't safe on a single-byte thermal code page with
 * ASCII equivalents. The printer renders raw bytes, so multi-byte UTF-8 glyphs
 * (₹, ·, ×, smart quotes) would print as garbage.
 */
function safe(str) {
  if (str == null) return str;
  return String(str)
    .replace(/₹/g, 'Rs')
    .replace(/[·•∙]/g, '-')
    .replace(/[×✕]/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/…/g, '...');
}

/**
 * A structured receipt is a GST sales invoice (vs. the legacy layout) when the
 * caller stamped a document type/title on it. Mirrors the web POS payload built
 * by buildStructuredReceipt() in POSReceipt.tsx.
 */
function isGstInvoice(data) {
  const inv = data.invoice || {};
  return Boolean(inv.documentType || inv.documentTitle);
}

/**
 * Group already-snapshotted per-line tax into a rate-wise summary. Derives no
 * new tax — it only sums and splits the line's taxAmount into CGST/SGST (intra)
 * or IGST (inter), exactly as the design doc §8 permits at render time.
 */
function buildRateSummary(items, intra) {
  const map = new Map();
  items.forEach((it) => {
    const rate = Number(it.gstRate ?? 0);
    const row = map.get(rate) || { rate, taxable: 0, tax: 0 };
    row.taxable += Number(it.taxableValue ?? 0);
    row.tax += Number(it.taxAmount ?? 0);
    map.set(rate, row);
  });
  return Array.from(map.values())
    .map((rw) => {
      const cgst = r2(rw.tax / 2);
      return {
        rate: rw.rate,
        taxable: r2(rw.taxable),
        cgst,
        sgst: r2(rw.tax - cgst),
        igst: r2(rw.tax),
      };
    })
    .sort((a, b) => a.rate - b.rate);
}

// One item block: title (+ variant) with the line amount on the first row,
// then a meta row "HSN · qty x rate" left / "GST n%" right.
function printGstItem(r, item, showHsn) {
  const w = r.width;
  const amountStr = inr(item.total);
  let title = safe(item.name);
  if (item.variant) title += ' - ' + safe(item.variant);

  const firstWidth = w - amountStr.length - 1;
  const titleLines = wrapText(title, w);

  r.bold(true);
  if (titleLines.length && titleLines[0].length <= firstWidth) {
    r.leftRight(titleLines[0], amountStr);
    for (let i = 1; i < titleLines.length; i++) r.textLine(titleLines[i]);
  } else {
    titleLines.forEach((l) => r.textLine(l));
    r.textLine(amountStr.padStart(w));
  }
  r.bold(false);

  const hsnPart = showHsn && item.hsn ? `HSN ${safe(item.hsn)} - ` : '';
  const metaLeft = `${hsnPart}${item.quantity} x ${inr(item.unitPrice)}`;
  const rate = Number(item.gstRate ?? 0);
  const metaRight = rate > 0 ? `GST ${rate}%` : showHsn ? 'GST 0%' : '';
  r.leftRight(metaLeft, metaRight);
}

/**
 * GST sales-invoice thermal receipt — recreation of InvoiceThermal.jsx from the
 * Claude Design "GST Invoice" handoff. Pure black-on-paper, 80mm (48 cols).
 */
async function formatGstReceipt(data) {
  const r = new ReceiptBuilder(data.paperWidth || 48);
  const w = r.width;
  const imgMaxWidth = w === 42 ? 320 : 384;

  const store = data.store || {};
  const inv = data.invoice || {};
  const sm = data.summary || {};
  const collectTax = sm.collectTax === true;
  const intra = (inv.supplyType || 'intra_state') !== 'inter_state';
  const showHsn = data.items.some((it) => it.hsn);

  r.initialize();
  r.newline();

  // ===== STORE LOGO =====
  if (store.logoUrl) {
    const logoBytes = await urlToEscposImage(store.logoUrl, imgMaxWidth);
    if (logoBytes) {
      r.alignCenter();
      r.bytes.push(...logoBytes);
      r.newline();
    }
  }

  // ===== BRAND HEADER =====
  r.alignCenter();
  r.bold(true).doubleHeight(true);
  r.textLine(safe(store.name));
  r.doubleHeight(false).bold(false);
  if (store.address) {
    wrapText(safe(store.address), w).forEach((l) => r.textLine(l));
  }
  if (store.phone) r.textLine(safe(store.phone));
  if (store.gstin) {
    r.bold(true);
    r.textLine('GSTIN ' + safe(store.gstin));
    r.bold(false);
  }
  r.alignLeft();

  // ===== DOCUMENT TITLE BAND =====
  r.newline();
  const docTitle =
    inv.documentTitle ||
    (inv.documentType === 'tax_invoice' ? 'TAX INVOICE' : 'BILL OF SUPPLY');
  r.invertedBand(safe(docTitle));

  // ===== META =====
  r.newline();
  if (inv.number) r.leftRight('No.', safe(inv.number));
  if (inv.date) {
    const dateVal = safe(inv.date) + (inv.time ? '  ' + safe(inv.time) : '');
    r.leftRight('Date', dateVal);
  }
  r.leftRight('Channel', safe(inv.channel || 'POS - Walk-in'));
  if (inv.placeOfSupply) r.leftRight('Place of supply', safe(inv.placeOfSupply));

  r.separator('-');

  // ===== BILL TO =====
  if (data.customer && (data.customer.name || data.customer.phone)) {
    r.bold(true);
    r.textLine('BILL TO');
    r.bold(false);
    if (data.customer.name) {
      r.bold(true);
      r.textLine(safe(data.customer.name));
      r.bold(false);
    }
    if (data.customer.phone) r.textLine(safe(data.customer.phone));
    r.separator('-');
  }

  // ===== ITEMS =====
  data.items.forEach((item, idx) => {
    printGstItem(r, item, showHsn);
    if (idx < data.items.length - 1) r.newline();
  });

  r.separator('.');

  // ===== TAX BLOCK =====
  if (collectTax) {
    r.leftRight('Taxable value', inr(sm.taxableValue));
    if (intra) {
      r.leftRight('CGST', inr(sm.cgst));
      r.leftRight('SGST', inr(sm.sgst));
    } else {
      r.leftRight('IGST', inr(sm.igst));
    }
    // Compact rate-wise breakdown strip
    buildRateSummary(data.items, intra).forEach((row) => {
      const left = `@ ${row.rate}% on ${inr(row.taxable)}`;
      const right = intra ? `${inr(row.cgst)} + ${inr(row.sgst)}` : inr(row.igst);
      r.leftRight(left, right);
    });
  } else {
    r.leftRight('Subtotal', inr(sm.taxableValue != null ? sm.taxableValue : sm.total));
  }

  r.separator('-');

  // ===== GRAND TOTAL =====
  r.bold(true).doubleHeight(true);
  r.leftRight('TOTAL', 'Rs ' + inr(sm.total));
  r.doubleHeight(false).bold(false);

  r.separator('-');

  // ===== PAYMENT =====
  if (inv.paymentMethod) r.leftRight('Paid via', safe(inv.paymentMethod));
  if (inv.ref) r.leftRight('Ref', safe(inv.ref));

  // ===== QR (optional, forward-compatible) =====
  if (data.qr && data.qr.url) {
    r.newline();
    r.alignCenter();
    r.qrCode(data.qr.url);
    r.bold(true);
    r.textLine(safe(data.qr.label || 'Scan to verify'));
    r.bold(false);
    if (data.qr.upi) r.textLine('UPI - ' + safe(data.qr.upi));
    r.alignLeft();
  }

  // ===== COMPOSITION DECLARATION =====
  if (data.declaration) {
    r.newline();
    r.boxedText(safe(data.declaration));
  }

  // ===== FOOTER =====
  if (data.footer) {
    r.newline();
    r.alignCenter();
    if (data.footer.message) {
      r.bold(true);
      r.textLine(safe(data.footer.message));
      r.bold(false);
    }
    if (data.footer.returnPolicy) r.textLine(safe(data.footer.returnPolicy));
    if (data.footer.website) r.textLine(safe(data.footer.website));
    if (data.footer.brandLogoUrl) {
      r.newline();
      const brandBytes = await urlToEscposImage(
        data.footer.brandLogoUrl,
        Math.floor(imgMaxWidth * 0.5),
      );
      if (brandBytes) {
        r.bytes.push(...brandBytes);
        r.newline();
      }
    }
    r.alignLeft();
  }

  r.newline();
  r.separator('=');
  r.feedAndCut(4);

  return r.build();
}

async function formatLegacyReceipt(data) {
  const r = new ReceiptBuilder(data.paperWidth || 48);
  const w = r.width;
  // Max pixel width: 80mm paper ≈ 384px at 203dpi, 58mm ≈ 384 for 48-col
  const imgMaxWidth = w === 42 ? 320 : 384;

  r.initialize();
  r.newline();

  // ===== STORE LOGO =====
  if (data.store && data.store.logoUrl) {
    const logoBytes = await urlToEscposImage(data.store.logoUrl, imgMaxWidth);
    if (logoBytes) {
      r.alignCenter();
      r.bytes.push(...logoBytes);
      r.newline();
    }
  }

  // ===== STORE HEADER =====
  if (data.store) {
    const s = data.store;
    r.alignCenter();
    r.separator('=');

    // Store name: double-height + bold
    r.bold(true).doubleHeight(true);
    r.textLine(s.name);
    r.doubleHeight(false).bold(false);

    if (s.address) r.textLine(s.address);
    if (s.phone) r.textLine('Phone: ' + s.phone);
    if (s.gstin) r.textLine('GSTIN: ' + s.gstin);
    if (s.email) r.textLine(s.email);

    r.alignLeft();
    r.separator('-');
  }

  // ===== INVOICE DETAILS =====
  if (data.invoice) {
    const inv = data.invoice;
    r.alignLeft();
    r.newline();

    if (inv.number) r.textLine(' Invoice: ' + inv.number);

    if (inv.date) {
      const datePart = ' Date: ' + inv.date;
      if (inv.time) {
        r.leftRight(datePart, 'Time: ' + inv.time + ' ');
      } else {
        r.textLine(datePart);
      }
    }

    if (inv.cashier) r.textLine(' Cashier: ' + inv.cashier);

    if (data.customer) {
      const c = data.customer;
      let line = ' Customer: ' + (c.name || '');
      if (c.phone) line += ' (' + c.phone + ')';
      r.textLine(line);
    }

    r.newline();
    r.separator('-');
  } else if (data.customer) {
    const c = data.customer;
    r.alignLeft();
    let line = ' Customer: ' + (c.name || '');
    if (c.phone) line += ' (' + c.phone + ')';
    r.textLine(line);
    r.separator('-');
  }

  // ===== ITEMS TABLE =====
  // Column layout: ITEM(24) QTY(5) PRICE(9) AMOUNT(10) = 48
  const colItem = w - 24;
  const colQty = 5;
  const colPrice = 9;
  const colAmount = 10;

  // Header
  r.alignLeft();
  r.bold(true);
  const header =
    ' ' + 'ITEM'.padEnd(colItem - 1) +
    'QTY'.padStart(colQty) +
    'PRICE'.padStart(colPrice) +
    'AMOUNT'.padStart(colAmount);
  r.textLine(header);
  r.bold(false);
  r.separator('-');

  // Items
  if (data.items && data.items.length > 0) {
    data.items.forEach((item, idx) => {
      // Item name (bold, word-wrapped)
      r.bold(true);
      const nameLines = wrapText(item.name, w - 4);
      nameLines.forEach((line, i) => r.textLine((i === 0 ? ' ' : '   ') + line));
      r.bold(false);

      // Variant
      if (item.variant) {
        const variantLines = wrapText(item.variant, w - 6);
        variantLines.forEach(line => r.textLine('   ' + line));
      }

      // Customisation
      if (item.customisation) {
        const custLines = wrapText(item.customisation, w - 6);
        custLines.forEach(line => r.textLine('   ' + line));
      }

      // Quantity, price, amount row (right-aligned numbers)
      const qtyStr = String(item.quantity).padStart(colQty);
      const priceStr = item.unitPrice != null ? formatMoney(item.unitPrice).padStart(colPrice) : ' '.repeat(colPrice);
      const amountStr = formatMoney(item.total).padStart(colAmount);
      const numLine = ' '.repeat(colItem) + qtyStr + priceStr + amountStr;
      r.textLine(numLine);

      // Per-item discount
      if (item.discount && item.discount > 0) {
        r.textLine('   Disc: -' + formatMoney(item.discount));
      }

      // Item separator (not after last item)
      if (idx < data.items.length - 1) {
        r.textLine(' ' + '.'.repeat(w - 2));
      }
    });
  }

  r.separator('-');

  // ===== SUMMARY =====
  if (data.summary) {
    const sm = data.summary;
    const labelWidth = 24;
    const valueWidth = w - labelWidth;

    const summaryLine = (label, value) => {
      const l = label.padStart(labelWidth) + ':';
      const v = formatMoney(value).padStart(valueWidth - 1);
      r.textLine(l + v);
    };

    r.newline();

    if (sm.subtotal != null) summaryLine('Subtotal', sm.subtotal);
    if (sm.discount && sm.discount > 0) summaryLine('Discount', -sm.discount);
    if (sm.taxAmount != null && sm.taxAmount > 0) {
      const taxLabel = sm.taxLabel || 'Tax';
      const taxStr = sm.taxPercent ? `${taxLabel} (${sm.taxPercent}%)` : taxLabel;
      summaryLine(taxStr, sm.taxAmount);
    }
    if (sm.shipping != null) summaryLine('Shipping', sm.shipping);
    if (sm.roundOff != null && sm.roundOff !== 0) summaryLine('Round Off', sm.roundOff);

    // Total separator
    r.alignLeft();
    const innerSep = '-'.repeat(w - 20);
    r.textLine(' '.repeat(20) + innerSep);

    // TOTAL line - double height + bold
    r.bold(true).doubleHeight(true);
    r.alignCenter();
    r.textLine('TOTAL:  Rs. ' + formatMoney(sm.total));
    r.doubleHeight(false).bold(false);
    r.alignLeft();

    r.textLine(' '.repeat(20) + innerSep);

    // Paid / Change
    if (sm.amountPaid != null) {
      r.newline();
      summaryLine('Paid', sm.amountPaid);
    }
    if (sm.change != null && sm.change > 0) {
      summaryLine('Change', sm.change);
    }
  }

  // ===== PAYMENT METHOD =====
  if (data.invoice && data.invoice.paymentMethod) {
    r.separator('-');
    r.alignCenter();
    r.textLine('Payment: ' + data.invoice.paymentMethod);
  }

  // ===== FOOTER =====
  if (data.footer) {
    r.separator('-');
    r.alignCenter();
    r.newline();
    if (data.footer.message) r.textLine(data.footer.message);
    if (data.footer.returnPolicy) r.textLine(data.footer.returnPolicy);
    if (data.footer.website) r.textLine(data.footer.website);

    // Brand logo (e.g. "Powered by Popup" logo)
    if (data.footer.brandLogoUrl) {
      r.newline();
      const brandBytes = await urlToEscposImage(data.footer.brandLogoUrl, Math.floor(imgMaxWidth * 0.5));
      if (brandBytes) {
        r.bytes.push(...brandBytes);
        r.newline();
      }
    }
  }

  // Final separator and cut
  r.alignLeft();
  r.newline();
  r.separator('=');
  r.feedAndCut(4);

  return r.build();
}

/**
 * Dispatch a structured receipt to the GST sales-invoice layout (when the
 * payload carries a document type) or the legacy sale-receipt layout.
 */
async function formatReceipt(data) {
  if (isGstInvoice(data)) return formatGstReceipt(data);
  return formatLegacyReceipt(data);
}

module.exports = { formatReceipt, formatGstReceipt, formatLegacyReceipt, ReceiptBuilder };
