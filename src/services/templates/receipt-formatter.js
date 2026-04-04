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

async function formatReceipt(data) {
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

module.exports = { formatReceipt, ReceiptBuilder };
