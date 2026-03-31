// API Base URL - dynamically detect based on current page location
const API_BASE = window.location.origin;

// Templates
const TEMPLATES = {
  'test-receipt': 'ESCPOSINITIALIZEESCPOSTEST - Receipt PrinterESCPOSNEWLINEPrint Agent WorkingESCPOSNEWLINEESCPOSCUT',

  'sample-receipt': JSON.stringify({
    type: "structured",
    store: {
      name: "M/s RISHABH BOMBAY DYEING",
      address: "Habsiguda, Hyderabad",
      phone: "+91-9876543210",
      gstin: "36ABCDE1234F1Z5"
    },
    invoice: {
      number: "INV-2026-001",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cashier: "Rishabh",
      paymentMethod: "Cash"
    },
    customer: {
      name: "John Doe",
      phone: "+91-9123456789"
    },
    items: [
      { name: "Bedsheet King Size", variant: "Blue Floral / King", customisation: "Monogram: JD", quantity: 2, unitPrice: 1299.00, discount: 100.00, total: 2498.00 },
      { name: "Towel Set Premium", variant: "White / Pack of 4", quantity: 1, unitPrice: 899.00, discount: 0, total: 899.00 },
      { name: "Cotton Pillow Cover Pair", variant: "Grey / Standard", quantity: 3, unitPrice: 349.00, discount: 50.00, total: 997.00 }
    ],
    summary: {
      subtotal: 4394.00,
      discount: 150.00,
      taxLabel: "GST",
      taxPercent: 5,
      taxAmount: 212.20,
      shipping: 0,
      roundOff: -0.20,
      total: 4456.00,
      amountPaid: 4500.00,
      change: 44.00
    },
    footer: {
      message: "Thank you for shopping with us!",
      returnPolicy: "Exchange within 7 days with bill",
      website: "www.rishabhbombaydyeing.com"
    }
  }, null, 2),

  'invoice': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .invoice-details { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #2563eb; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
    .total { font-size: 20px; font-weight: bold; text-align: right; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>INVOICE</h1>
      <p><strong>Invoice #:</strong> INV-2025-001</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
    </div>
    <div style="text-align: right;">
      <h2>My Company</h2>
      <p>123 Business St<br>City, State 12345<br>Phone: (555) 123-4567</p>
    </div>
  </div>

  <div class="invoice-details">
    <h3>Bill To:</h3>
    <p><strong>Customer Name</strong><br>456 Customer Ave<br>City, State 67890</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Product A - Premium Service</td>
        <td>2</td>
        <td>$100.00</td>
        <td>$200.00</td>
      </tr>
      <tr>
        <td>Product B - Standard Package</td>
        <td>1</td>
        <td>$150.00</td>
        <td>$150.00</td>
      </tr>
      <tr>
        <td>Product C - Additional Features</td>
        <td>3</td>
        <td>$50.00</td>
        <td>$150.00</td>
      </tr>
    </tbody>
  </table>

  <div class="total">
    <p>Subtotal: $500.00</p>
    <p>Tax (10%): $50.00</p>
    <p style="color: #2563eb;">Total: $550.00</p>
  </div>

  <p style="margin-top: 40px; text-align: center; color: #64748b;">
    Thank you for your business!
  </p>
</body>
</html>`,

  'report': `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #16a34a; border-bottom: 3px solid #16a34a; padding-bottom: 10px; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin: 30px 0; }
    .summary-card { background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; }
    .summary-value { font-size: 32px; font-weight: bold; color: #16a34a; }
    .summary-label { color: #64748b; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background: #16a34a; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <h1>Sales Report</h1>
  <p><strong>Period:</strong> ${new Date().toLocaleDateString()}</p>

  <div class="summary">
    <div class="summary-card">
      <div class="summary-value">142</div>
      <div class="summary-label">Total Sales</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">$12,450</div>
      <div class="summary-label">Revenue</div>
    </div>
    <div class="summary-card">
      <div class="summary-value">87.6%</div>
      <div class="summary-label">Growth</div>
    </div>
  </div>

  <h2>Top Products</h2>
  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Units Sold</th>
        <th>Revenue</th>
        <th>Trend</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Premium Service Package</td>
        <td>45</td>
        <td>$4,500</td>
        <td style="color: #16a34a;">↑ 23%</td>
      </tr>
      <tr>
        <td>Standard Service</td>
        <td>67</td>
        <td>$5,025</td>
        <td style="color: #16a34a;">↑ 15%</td>
      </tr>
      <tr>
        <td>Basic Package</td>
        <td>30</td>
        <td>$2,925</td>
        <td style="color: #dc2626;">↓ 5%</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`
};

// State
let currentJobHistory = [];
let statusInterval = null;
// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeButtons();
  loadPrinterStatus();
  loadQueueStats();
  loadJobHistory();
  loadNetworkInfo();
  startStatusPolling();
});

// Tab switching
function initializeTabs() {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(tc => tc.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

// Initialize all button handlers
function initializeButtons() {
  // Template buttons
  document.querySelectorAll('.btn-template').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const template = e.target.dataset.template;
      loadTemplate(template);
    });
  });

  // Receipt buttons
  document.getElementById('preview-receipt').addEventListener('click', () => previewReceipt());
  document.getElementById('print-receipt').addEventListener('click', () => printReceipt());

  // A4 buttons
  document.getElementById('preview-a4').addEventListener('click', () => previewA4());
  document.getElementById('print-a4').addEventListener('click', () => printA4());

  // Sticker buttons
  document.getElementById('sticker-sample-btn').addEventListener('click', () => loadStickerSample());
  document.getElementById('print-sticker').addEventListener('click', () => printSticker());
  attachStickerPreviewListeners();

  // Discounted Sticker buttons
  document.getElementById('discount-sticker-sample-btn').addEventListener('click', () => loadDiscountStickerSample());
  document.getElementById('print-discount-sticker').addEventListener('click', () => printDiscountSticker());
  attachDiscountStickerPreviewListeners();

}

// Load template into textarea
function loadTemplate(templateName) {
  const template = TEMPLATES[templateName];
  if (!template) return;

  if (templateName.includes('receipt')) {
    document.getElementById('receipt-data').value = template;
    previewReceipt();
  } else if (templateName.includes('invoice') || templateName.includes('report')) {
    document.getElementById('a4-data').value = template;
    document.querySelector('input[name="a4-type"][value="html"]').checked = true;
    previewA4();
  }
}

// Preview Receipt
function previewReceipt() {
  const data = document.getElementById('receipt-data').value;
  const preview = document.getElementById('receipt-preview');

  if (!data) {
    preview.innerHTML = '<div class="preview-placeholder">Enter receipt data or use templates</div>';
    return;
  }

  // Try parsing as structured JSON first
  try {
    const parsed = JSON.parse(data);
    if (parsed.type === 'structured') {
      preview.innerHTML = renderStructuredReceiptPreview(parsed);
      return;
    }
  } catch (e) {
    // Not JSON, fall through to ESC/POS preview
  }

  // Parse ESC/POS-like commands for preview
  let html = parseESCPOSForPreview(data);
  preview.innerHTML = html;
}

// Parse ESC/POS commands to HTML preview
function parseESCPOSForPreview(data) {
  let html = '';
  let isBold = false;
  let alignment = 'left';

  // Split by ESCPOS commands
  const parts = data.split(/(ESCPOS[A-Z]+)/);

  parts.forEach(part => {
    if (part.startsWith('ESCPOS')) {
      // Handle commands
      if (part === 'ESCPOSINITIALIZE' || part === 'ESCPOSINIT') {
        html += '';
      } else if (part === 'ESCPOSNEWLINE') {
        html += '<br>';
      } else if (part === 'ESCPOSBOLDON') {
        isBold = true;
      } else if (part === 'ESCPOSBOLDOFF') {
        isBold = false;
      } else if (part === 'ESCPOSALIGNCT') {
        alignment = 'center';
      } else if (part === 'ESCPOSALIGNLT') {
        alignment = 'left';
      } else if (part === 'ESCPOSALIGNRT') {
        alignment = 'right';
      } else if (part === 'ESCPOSCUT') {
        html += '<div style="border-top: 2px dashed #ccc; margin: 10px 0;"></div>';
      }
    } else if (part.trim()) {
      // Regular text
      let style = '';
      if (isBold) style += 'font-weight: bold;';
      if (alignment !== 'left') style += `text-align: ${alignment};`;

      html += `<div style="${style}">${escapeHtml(part)}</div>`;
    }
  });

  return html || '<div class="preview-placeholder">Preview will appear here</div>';
}

// Render structured receipt JSON as HTML preview (mimics thermal receipt)
function renderStructuredReceiptPreview(data) {
  const esc = escapeHtml;
  let h = '<div style="font-family: \'Courier New\', monospace; font-size: 12px; line-height: 1.5; padding: 12px 8px; max-width: 100%;">';

  // Store header
  if (data.store) {
    h += '<div style="text-align:center; border-top: 2px solid #333; border-bottom: 1px dashed #999; padding: 8px 0; margin-bottom: 8px;">';
    h += `<div style="font-size: 16px; font-weight: bold;">${esc(data.store.name)}</div>`;
    if (data.store.address) h += `<div>${esc(data.store.address)}</div>`;
    if (data.store.phone) h += `<div>Phone: ${esc(data.store.phone)}</div>`;
    if (data.store.gstin) h += `<div>GSTIN: ${esc(data.store.gstin)}</div>`;
    if (data.store.email) h += `<div>${esc(data.store.email)}</div>`;
    h += '</div>';
  }

  // Invoice details
  if (data.invoice) {
    h += '<div style="margin-bottom: 8px;">';
    if (data.invoice.number) h += `<div>Invoice: ${esc(data.invoice.number)}</div>`;
    if (data.invoice.date) {
      let line = `Date: ${esc(data.invoice.date)}`;
      if (data.invoice.time) line += `&nbsp;&nbsp;&nbsp;Time: ${esc(data.invoice.time)}`;
      h += `<div>${line}</div>`;
    }
    if (data.invoice.cashier) h += `<div>Cashier: ${esc(data.invoice.cashier)}</div>`;
    if (data.customer) {
      let cust = `Customer: ${esc(data.customer.name || '')}`;
      if (data.customer.phone) cust += ` (${esc(data.customer.phone)})`;
      h += `<div>${cust}</div>`;
    }
    h += '</div>';
  }

  // Items table
  h += '<div style="border-top: 1px dashed #999; border-bottom: 1px dashed #999; padding: 8px 0; margin-bottom: 8px;">';
  h += '<div style="font-weight: bold; display: flex; margin-bottom: 6px;">';
  h += '<span style="flex: 3;">ITEM</span><span style="flex: 0.5; text-align: right;">QTY</span><span style="flex: 1; text-align: right;">PRICE</span><span style="flex: 1; text-align: right;">AMOUNT</span>';
  h += '</div>';

  if (data.items) {
    data.items.forEach((item, idx) => {
      if (idx > 0) h += '<div style="border-top: 1px dotted #ccc; margin: 4px 0;"></div>';
      h += `<div style="font-weight: bold;">${esc(item.name)}</div>`;
      if (item.variant) h += `<div style="font-size: 11px; color: #555; padding-left: 8px;">${esc(item.variant)}</div>`;
      if (item.customisation) h += `<div style="font-size: 11px; color: #555; padding-left: 8px;">${esc(item.customisation)}</div>`;
      h += '<div style="display: flex;">';
      h += `<span style="flex: 3;"></span>`;
      h += `<span style="flex: 0.5; text-align: right;">${item.quantity}</span>`;
      h += `<span style="flex: 1; text-align: right;">${item.unitPrice != null ? item.unitPrice.toFixed(2) : ''}</span>`;
      h += `<span style="flex: 1; text-align: right;">${item.total.toFixed(2)}</span>`;
      h += '</div>';
      if (item.discount > 0) {
        h += `<div style="font-size: 11px; color: #c00; padding-left: 8px;">Disc: -${item.discount.toFixed(2)}</div>`;
      }
    });
  }
  h += '</div>';

  // Summary
  if (data.summary) {
    const sm = data.summary;
    const sline = (label, val) => `<div style="display: flex; justify-content: flex-end; gap: 16px;"><span>${esc(label)}:</span><span style="min-width: 80px; text-align: right;">${Number(val).toFixed(2)}</span></div>`;

    if (sm.subtotal != null) h += sline('Subtotal', sm.subtotal);
    if (sm.discount > 0) h += sline('Discount', -sm.discount);
    if (sm.taxAmount > 0) {
      const tl = sm.taxLabel || 'Tax';
      const ts = sm.taxPercent ? `${tl} (${sm.taxPercent}%)` : tl;
      h += sline(ts, sm.taxAmount);
    }
    if (sm.shipping != null) h += sline('Shipping', sm.shipping);
    if (sm.roundOff != null && sm.roundOff !== 0) h += sline('Round Off', sm.roundOff);

    h += '<div style="border-top: 2px solid #333; margin: 8px 0; padding-top: 8px; text-align: center; font-size: 18px; font-weight: bold;">';
    h += `TOTAL: Rs. ${sm.total.toFixed(2)}`;
    h += '</div>';

    if (sm.amountPaid != null) h += sline('Paid', sm.amountPaid);
    if (sm.change != null && sm.change > 0) h += sline('Change', sm.change);
  }

  // Payment method
  if (data.invoice && data.invoice.paymentMethod) {
    h += `<div style="text-align: center; border-top: 1px dashed #999; padding-top: 6px; margin-top: 8px;">Payment: ${esc(data.invoice.paymentMethod)}</div>`;
  }

  // Footer
  if (data.footer) {
    h += '<div style="text-align: center; border-top: 1px dashed #999; padding-top: 8px; margin-top: 8px; font-size: 11px;">';
    if (data.footer.message) h += `<div>${esc(data.footer.message)}</div>`;
    if (data.footer.returnPolicy) h += `<div>${esc(data.footer.returnPolicy)}</div>`;
    if (data.footer.website) h += `<div>${esc(data.footer.website)}</div>`;
    h += '</div>';
  }

  h += '<div style="border-top: 2px solid #333; margin-top: 8px;"></div>';
  h += '</div>';
  return h;
}

// Print Receipt
async function printReceipt() {
  const rawData = document.getElementById('receipt-data').value;
  const resultDiv = document.getElementById('receipt-result');

  if (!rawData) {
    showResult(resultDiv, 'error', 'Please enter receipt data');
    return;
  }

  // Determine if data is structured JSON or raw ESC/POS string
  let payload;
  try {
    const parsed = JSON.parse(rawData);
    if (parsed.type === 'structured') {
      payload = { data: parsed };
    } else {
      payload = { data: rawData };
    }
  } catch (e) {
    payload = { data: rawData };
  }

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const response = await fetch(`${API_BASE}/print/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      showResult(resultDiv, 'success', `✓ Print job sent! Job ID: ${result.jobId}`);
      setTimeout(() => {
        loadQueueStats();
        loadJobHistory();
      }, 500);
    } else {
      showResult(resultDiv, 'error', `✗ Error: ${result.message || result.error || 'Failed to print'}`);
    }
  } catch (error) {
    showResult(resultDiv, 'error', `✗ Network error: ${error.message}`);
  }
}

// Preview A4
function previewA4() {
  const data = document.getElementById('a4-data').value;
  const type = document.querySelector('input[name="a4-type"]:checked').value;
  const preview = document.getElementById('a4-preview');

  if (!data) {
    preview.srcdoc = '<div style="padding: 40px; text-align: center; color: #64748b;">Enter HTML or PDF data</div>';
    return;
  }

  if (type === 'html') {
    preview.srcdoc = data;
  } else {
    preview.srcdoc = '<div style="padding: 40px; text-align: center; color: #64748b;">PDF preview not available<br>(will be rendered during print)</div>';
  }
}

// Print A4
async function printA4() {
  const data = document.getElementById('a4-data').value;
  const type = document.querySelector('input[name="a4-type"]:checked').value;
  const resultDiv = document.getElementById('a4-result');

  if (!data) {
    showResult(resultDiv, 'error', 'Please enter document data');
    return;
  }

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const payload = type === 'html'
      ? { type: 'html', content: data }
      : { type: 'pdf', content: data };

    const response = await fetch(`${API_BASE}/print/a4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      showResult(resultDiv, 'success', `✓ Print job sent! Job ID: ${result.jobId}`);
      setTimeout(() => {
        loadQueueStats();
        loadJobHistory();
      }, 500);
    } else {
      showResult(resultDiv, 'error', `✗ Error: ${result.message || result.error || 'Failed to print'}`);
    }
  } catch (error) {
    showResult(resultDiv, 'error', `✗ Network error: ${error.message}`);
  }
}

// Load network info
async function loadNetworkInfo() {
  try {
    const response = await fetch(`${API_BASE}/network-info`);
    const data = await response.json();

    if (data.status === 'ok' && data.urls.length > 0) {
      const container = document.getElementById('network-info');
      const urlsEl = document.getElementById('network-urls');

      urlsEl.innerHTML = data.urls.map(url => `
        <span class="network-url" title="Click to copy" onclick="copyToClipboard('${url}', this)">
          ${url}
          <span class="copy-hint">click to copy</span>
        </span>
      `).join('');

      container.style.display = 'block';
    }
  } catch (error) {
    console.error('Failed to load network info:', error);
  }
}

// Copy text to clipboard
function copyToClipboard(text, el) {
  navigator.clipboard.writeText(text).then(() => {
    const hint = el.querySelector('.copy-hint');
    const original = hint.textContent;
    hint.textContent = 'copied!';
    hint.style.opacity = '1';
    setTimeout(() => {
      hint.textContent = original;
      hint.style.opacity = '';
    }, 1500);
  });
}

// Load printer status
async function loadPrinterStatus() {
  try {
    const response = await fetch(`${API_BASE}/printers`);
    const data = await response.json();

    if (data.status === 'ok') {
      updateApiStatus(true);
      renderPrinters(data.printers);
    } else {
      updateApiStatus(false);
    }
  } catch (error) {
    updateApiStatus(false);
    console.error('Failed to load printers:', error);
  }
}

// Render printers list
function renderPrinters(printers) {
  const container = document.getElementById('printers-list');

  if (!printers || printers.length === 0) {
    container.innerHTML = '<div class="loading">No printers configured</div>';
    return;
  }

  container.innerHTML = printers.map(printer => `
    <div class="printer-item ${printer.online ? 'online' : 'offline'}">
      <div class="printer-info">
        <div class="printer-name">${escapeHtml(printer.name)}</div>
        <div class="printer-type">${escapeHtml(printer.type)}</div>
      </div>
      <div class="printer-status ${printer.online ? 'online' : 'offline'}">
        <span class="status-dot ${printer.online ? 'online' : 'offline'}"></span>
        ${printer.online ? 'Online' : 'Offline'}
      </div>
    </div>
  `).join('');
}

// Load queue statistics
async function loadQueueStats() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    const data = await response.json();

    if (data.status === 'ok') {
      renderQueueStats(data.queue);
    }
  } catch (error) {
    console.error('Failed to load queue stats:', error);
  }
}

// Render queue statistics
function renderQueueStats(stats) {
  const container = document.getElementById('queue-stats');

  container.innerHTML = `
    <div class="stat">
      <div class="stat-label">Total Jobs</div>
      <div class="stat-value">${stats.total || 0}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Completed</div>
      <div class="stat-value">${stats.completed || 0}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Failed</div>
      <div class="stat-value" style="color: ${stats.failed > 0 ? 'var(--danger)' : 'var(--primary)'}">${stats.failed || 0}</div>
    </div>
    <div class="stat">
      <div class="stat-label">Avg Duration</div>
      <div class="stat-value">${stats.averageDuration ? Math.round(stats.averageDuration) + 'ms' : '-'}</div>
    </div>
  `;
}

// Update API status indicator
function updateApiStatus(online) {
  const statusItem = document.getElementById('api-status');
  const dot = statusItem.querySelector('.status-dot');
  const text = statusItem.querySelector('span:last-child');

  if (online) {
    dot.classList.add('online');
    dot.classList.remove('offline');
    text.textContent = 'API: Connected';
  } else {
    dot.classList.add('offline');
    dot.classList.remove('online');
    text.textContent = 'API: Disconnected';
  }
}

// Load job history
async function loadJobHistory() {
  try {
    const response = await fetch(`${API_BASE}/jobs?limit=50`);
    const data = await response.json();

    if (data.status === 'ok') {
      renderJobHistory(data.jobs);
    }
  } catch (error) {
    console.error('Failed to load job history:', error);
    const container = document.getElementById('job-history');
    container.innerHTML = '<div class="loading">Failed to load job history</div>';
  }
}

// Render job history
function renderJobHistory(jobs) {
  const container = document.getElementById('job-history');

  if (!jobs || jobs.length === 0) {
    container.innerHTML = '<div class="loading">No print jobs yet</div>';
    return;
  }

  container.innerHTML = jobs.map(job => {
    const timestamp = new Date(job.createdAt).toLocaleString();
    const duration = job.duration ? `${job.duration}ms` : '-';

    return `
      <div class="job-item">
        <div>
          <div class="job-id">${escapeHtml(job.jobId)}</div>
          <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
            ${escapeHtml(job.printerType)} • ${timestamp} ${job.duration ? `• ${duration}` : ''}
          </div>
        </div>
        <div class="job-status ${job.status}">${job.status}</div>
      </div>
    `;
  }).join('');
}

// Start polling for status updates
function startStatusPolling() {
  // Poll every 5 seconds
  statusInterval = setInterval(() => {
    loadPrinterStatus();
    loadQueueStats();
    loadJobHistory();
  }, 5000);
}

// Show result message
function showResult(element, type, message) {
  element.className = `result-message show ${type}`;
  element.textContent = message;

  setTimeout(() => {
    element.classList.remove('show');
  }, 5000);
}

// Utility: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Sticker Label Functions =====

// Load sample sticker data
function loadStickerSample() {
  document.getElementById('sticker-company_name').value = 'M/s RISHABH BOMBAY DYEING';
  document.getElementById('sticker-company_description').value = 'Habsiguda, Hyderabad';
  document.getElementById('sticker-product_name').value = 'Bedsheet King Size Premium';
  document.getElementById('sticker-description').value = '100% Cotton, 300 TC, Breathable Fabric';
  document.getElementById('sticker-size').value = 'King';
  document.getElementById('sticker-price').value = '1299';
  document.getElementById('sticker-barcode').value = '8901234567890';
  updateStickerPreview();
}

// Collect sticker form data
function getStickerFormData() {
  return {
    company_name: document.getElementById('sticker-company_name').value.trim(),
    company_description: document.getElementById('sticker-company_description').value.trim(),
    product_name: document.getElementById('sticker-product_name').value.trim(),
    description: document.getElementById('sticker-description').value.trim(),
    size: document.getElementById('sticker-size').value.trim(),
    price: document.getElementById('sticker-price').value.trim(),
    barcode: document.getElementById('sticker-barcode').value.trim()
  };
}

// Update sticker live preview
function updateStickerPreview() {
  const preview = document.getElementById('sticker-preview');
  const data = getStickerFormData();

  if (!data.product_name && !data.price && !data.barcode) {
    preview.innerHTML = '<div class="preview-placeholder">Fill in the fields to see a live preview</div>';
    return;
  }

  let html = '<div style="border: 2px solid #333; padding: 8px; background: white; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3;">';

  // Company header
  html += `<div style="text-align: center; margin-bottom: 2px;">`;
  html += `<div style="font-size: 9px; font-weight: bold;">${escapeHtml(data.company_name || 'Company Name')}</div>`;
  if (data.company_description) {
    html += `<div style="font-size: 7px;">${escapeHtml(data.company_description)}</div>`;
  }
  html += `</div>`;

  // Separator
  html += '<div style="border-top: 1px solid #333; margin: 4px 0;"></div>';

  // Product name
  html += `<div style="font-size: 11px; font-weight: bold; margin-bottom: 3px;">${escapeHtml(data.product_name || 'Product Name')}</div>`;

  // Description
  if (data.description) {
    html += `<div style="font-size: 8px; color: #444; margin-bottom: 3px;">${escapeHtml(data.description)}</div>`;
  }

  // Size
  if (data.size) {
    html += `<div style="font-size: 8px; margin-bottom: 3px;">Size: ${escapeHtml(data.size)}</div>`;
  }

  // Separator
  html += '<div style="border-top: 1px solid #333; margin: 4px 0;"></div>';

  // Barcode + Price row
  html += '<div style="display: flex; justify-content: space-between; align-items: center;">';
  html += `<div style="flex: 1; background: #000; color: white; font-family: monospace; text-align: center; font-size: 7px; padding: 4px 2px; margin-right: 8px;">|||| ${escapeHtml(data.barcode || 'BARCODE')} ||||</div>`;
  html += `<div style="font-size: 12px; font-weight: bold; white-space: nowrap;">Rs. ${escapeHtml(data.price || '0')}/-</div>`;
  html += '</div>';

  html += '</div>';
  preview.innerHTML = html;
}

// Attach live preview listeners to sticker form inputs
function attachStickerPreviewListeners() {
  const fields = ['company_name', 'company_description', 'product_name', 'description', 'size', 'price', 'barcode'];
  fields.forEach(field => {
    const input = document.getElementById(`sticker-${field}`);
    if (input) {
      input.addEventListener('input', updateStickerPreview);
    }
  });
}

// Print sticker label
async function printSticker() {
  const resultDiv = document.getElementById('sticker-result');
  const data = getStickerFormData();

  // Validate required fields
  const missing = [];
  if (!data.product_name) missing.push('Product Name');
  if (!data.price) missing.push('Price');
  if (!data.barcode) missing.push('Barcode');

  if (missing.length > 0) {
    // Highlight missing fields
    ['product_name', 'price', 'barcode'].forEach(field => {
      const input = document.getElementById(`sticker-${field}`);
      if (!input.value.trim()) {
        input.style.borderColor = 'var(--danger)';
      } else {
        input.style.borderColor = 'var(--border)';
      }
    });
    showResult(resultDiv, 'error', `Please fill in required fields: ${missing.join(', ')}`);
    return;
  }

  // Reset border colors
  ['product_name', 'price', 'barcode'].forEach(field => {
    document.getElementById(`sticker-${field}`).style.borderColor = 'var(--border)';
  });

  const copies = parseInt(document.getElementById('sticker-copies').value) || 1;

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const response = await fetch(`${API_BASE}/print/sticker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, copies })
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      showResult(resultDiv, 'success', `Print job sent! Job ID: ${result.jobId} (${copies} ${copies > 1 ? 'copies' : 'copy'})`);
      setTimeout(() => {
        loadQueueStats();
        loadJobHistory();
      }, 500);
    } else {
      showResult(resultDiv, 'error', `Error: ${result.message || result.error || 'Failed to print'}`);
    }
  } catch (error) {
    showResult(resultDiv, 'error', `Network error: ${error.message}`);
  }
}

// ===== Discounted Sticker Label Functions =====

function loadDiscountStickerSample() {
  document.getElementById('discount-sticker-company_name').value = 'M/s RISHABH BOMBAY DYEING';
  document.getElementById('discount-sticker-company_description').value = 'Habsiguda, Hyderabad';
  document.getElementById('discount-sticker-product_name').value = 'Bedsheet King Size Premium';
  document.getElementById('discount-sticker-description').value = '100% Cotton, 300 TC, Breathable Fabric';
  document.getElementById('discount-sticker-size').value = 'King';
  document.getElementById('discount-sticker-price').value = '1299';
  document.getElementById('discount-sticker-offer_percentage').value = '20';
  calculateDiscountedPrice();
  document.getElementById('discount-sticker-barcode').value = '8901234567890';
  updateDiscountStickerPreview();
}

function calculateDiscountedPrice() {
  const price = parseFloat(document.getElementById('discount-sticker-price').value);
  const offer = parseFloat(document.getElementById('discount-sticker-offer_percentage').value);
  const discountedInput = document.getElementById('discount-sticker-discounted_price');
  if (!isNaN(price) && !isNaN(offer) && offer > 0 && offer < 100) {
    discountedInput.value = Math.round(price - (price * offer / 100));
  } else {
    discountedInput.value = '';
  }
}

function getDiscountStickerFormData() {
  return {
    company_name: document.getElementById('discount-sticker-company_name').value.trim(),
    company_description: document.getElementById('discount-sticker-company_description').value.trim(),
    product_name: document.getElementById('discount-sticker-product_name').value.trim(),
    description: document.getElementById('discount-sticker-description').value.trim(),
    size: document.getElementById('discount-sticker-size').value.trim(),
    price: document.getElementById('discount-sticker-price').value.trim(),
    offer_percentage: document.getElementById('discount-sticker-offer_percentage').value.trim(),
    discounted_price: document.getElementById('discount-sticker-discounted_price').value.trim(),
    barcode: document.getElementById('discount-sticker-barcode').value.trim()
  };
}

function updateDiscountStickerPreview() {
  const preview = document.getElementById('discount-sticker-preview');
  const data = getDiscountStickerFormData();

  if (!data.product_name && !data.price && !data.barcode) {
    preview.innerHTML = '<div class="preview-placeholder">Fill in the fields to see a live preview</div>';
    return;
  }

  let html = '<div style="border: 2px solid #333; padding: 8px; background: white; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3;">';

  // Company header
  html += '<div style="text-align: center; margin-bottom: 2px;">';
  html += `<div style="font-size: 9px; font-weight: bold;">${escapeHtml(data.company_name || 'Company Name')}</div>`;
  if (data.company_description) {
    html += `<div style="font-size: 7px;">${escapeHtml(data.company_description)}</div>`;
  }
  html += '</div>';

  // Separator
  html += '<div style="border-top: 1px solid #333; margin: 3px 0;"></div>';

  // Product name
  html += `<div style="font-size: 10px; font-weight: bold; margin-bottom: 2px;">${escapeHtml(data.product_name || 'Product Name')}</div>`;

  // Description
  if (data.description) {
    html += `<div style="font-size: 7px; color: #444; margin-bottom: 2px;">${escapeHtml(data.description)}</div>`;
  }

  // Size
  if (data.size) {
    html += `<div style="font-size: 7px; margin-bottom: 2px;">Size: ${escapeHtml(data.size)}</div>`;
  }

  // Separator
  html += '<div style="border-top: 1px solid #333; margin: 3px 0;"></div>';

  // HStack: Barcode (left) + VStack: MRP, discount, price (right)
  html += '<div style="display: flex; align-items: center; gap: 6px;">';
  html += `<div style="flex: 1; background: #000; color: white; font-family: monospace; text-align: center; font-size: 7px; padding: 4px 2px;">|||| ${escapeHtml(data.barcode || 'BARCODE')} ||||</div>`;
  html += '<div style="text-align: right; white-space: nowrap;">';
  html += `<div style="font-size: 7px; text-decoration: line-through; color: #888;">MRP: Rs.${escapeHtml(data.price || '0')}</div>`;
  if (data.offer_percentage) {
    html += `<div style="font-size: 8px; font-weight: bold; color: #c00;">${escapeHtml(data.offer_percentage)}% OFF</div>`;
  }
  html += `<div style="font-size: 12px; font-weight: bold;">Rs.${escapeHtml(data.discounted_price || '0')}/-</div>`;
  html += '</div>';
  html += '</div>';

  html += '</div>';
  preview.innerHTML = html;
}

function attachDiscountStickerPreviewListeners() {
  const fields = ['company_name', 'company_description', 'product_name', 'description', 'size', 'price', 'offer_percentage', 'discounted_price', 'barcode'];
  fields.forEach(field => {
    const input = document.getElementById(`discount-sticker-${field}`);
    if (input) {
      input.addEventListener('input', updateDiscountStickerPreview);
    }
  });
  ['price', 'offer_percentage'].forEach(field => {
    const input = document.getElementById(`discount-sticker-${field}`);
    if (input) {
      input.addEventListener('input', () => {
        calculateDiscountedPrice();
        updateDiscountStickerPreview();
      });
    }
  });
}

async function printDiscountSticker() {
  const resultDiv = document.getElementById('discount-sticker-result');
  const data = getDiscountStickerFormData();

  const missing = [];
  if (!data.product_name) missing.push('Product Name');
  if (!data.price) missing.push('MRP');
  if (!data.offer_percentage) missing.push('Offer %');
  if (!data.discounted_price) missing.push('Price After Discount');
  if (!data.barcode) missing.push('Barcode');

  if (missing.length > 0) {
    ['product_name', 'price', 'offer_percentage', 'discounted_price', 'barcode'].forEach(field => {
      const input = document.getElementById(`discount-sticker-${field}`);
      if (!input.value.trim()) {
        input.style.borderColor = 'var(--danger)';
      } else {
        input.style.borderColor = 'var(--border)';
      }
    });
    showResult(resultDiv, 'error', `Please fill in required fields: ${missing.join(', ')}`);
    return;
  }

  ['product_name', 'price', 'offer_percentage', 'discounted_price', 'barcode'].forEach(field => {
    document.getElementById(`discount-sticker-${field}`).style.borderColor = 'var(--border)';
  });

  const copies = parseInt(document.getElementById('discount-sticker-copies').value) || 1;

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const response = await fetch(`${API_BASE}/print/discount-sticker`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, copies })
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      showResult(resultDiv, 'success', `Print job sent! Job ID: ${result.jobId} (${copies} ${copies > 1 ? 'copies' : 'copy'})`);
      setTimeout(() => {
        loadQueueStats();
        loadJobHistory();
      }, 500);
    } else {
      showResult(resultDiv, 'error', `Error: ${result.message || result.error || 'Failed to print'}`);
    }
  } catch (error) {
    showResult(resultDiv, 'error', `Network error: ${error.message}`);
  }
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});
