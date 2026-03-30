// API Base URL - dynamically detect based on current page location
const API_BASE = window.location.origin;

// Templates
const TEMPLATES = {
  'test-receipt': 'ESCPOSINITIALIZEESCPOSTEST - Receipt PrinterESCPOSNEWLINEPrint Agent WorkingESCPOSNEWLINEESCPOSCUT',

  'sample-receipt': `ESCPOSINITIALIZE` +
    `ESCPOSALIGNCTESCPOSBOLDONMy Store NameESCPOSBOLDOFFESCPOSNEWLINE` +
    `ESCPOSALIGNLT123 Main St, City, StateESCPOSNEWLINE` +
    `Tel: (555) 123-4567ESCPOSNEWLINEESCPOSNEWLINE` +
    `ESCPOSALIGNLTDate: ${new Date().toLocaleDateString()}ESCPOSNEWLINE` +
    `Time: ${new Date().toLocaleTimeString()}ESCPOSNEWLINEESCPOSNEWLINE` +
    `--------------------------------ESCPOSNEWLINE` +
    `Item            Qty      PriceESCPOSNEWLINE` +
    `--------------------------------ESCPOSNEWLINE` +
    `Product A       2       $10.00ESCPOSNEWLINE` +
    `Product B       1       $25.00ESCPOSNEWLINE` +
    `Product C       3       $15.00ESCPOSNEWLINE` +
    `--------------------------------ESCPOSNEWLINE` +
    `ESCPOSBOLDONTotal:              $50.00ESCPOSBOLDOFFESCPOSNEWLINE` +
    `--------------------------------ESCPOSNEWLINEESCPOSNEWLINE` +
    `Thank you for your purchase!ESCPOSNEWLINEESCPOSNEWLINE` +
    `ESCPOSCUT`,

  'test-label': `SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
CLS
TEXT 10,5,"3",0,1,1,"Print Agent Test"
TEXT 10,35,"2",0,1,1,"Label: 60mm x 40mm - Working OK!"
PRINT 1
`,

  'barcode-label': `SIZE 60 mm, 40 mm
GAP 2 mm, 0 mm
CLS
TEXT 50,10,"3",0,1,1,"PRODUCT #12345"
BARCODE 50,60,"128",80,1,0,2,2,"12345678"
TEXT 50,180,"2",0,1,1,"$29.99"
PRINT 1
`,

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
let availableTemplates = {};
let selectedTemplate = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeButtons();
  loadPrinterStatus();
  loadQueueStats();
  loadJobHistory();
  loadLabelTemplates();
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

  // Label buttons
  document.getElementById('preview-label').addEventListener('click', () => previewLabel());
  document.getElementById('print-label').addEventListener('click', () => printLabel());

  // A4 buttons
  document.getElementById('preview-a4').addEventListener('click', () => previewA4());
  document.getElementById('print-a4').addEventListener('click', () => printA4());

  // Label template buttons
  document.getElementById('template-select').addEventListener('change', (e) => onTemplateSelect(e.target.value));
  document.getElementById('print-template').addEventListener('click', () => printLabelTemplate());
}

// Load template into textarea
function loadTemplate(templateName) {
  const template = TEMPLATES[templateName];
  if (!template) return;

  if (templateName.includes('receipt')) {
    document.getElementById('receipt-data').value = template;
    previewReceipt();
  } else if (templateName.includes('label')) {
    document.getElementById('label-data').value = template;
    previewLabel();
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
    preview.innerHTML = '<div class="preview-placeholder">Enter ESC/POS commands or use templates</div>';
    return;
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

// Print Receipt
async function printReceipt() {
  const data = document.getElementById('receipt-data').value;
  const resultDiv = document.getElementById('receipt-result');

  if (!data) {
    showResult(resultDiv, 'error', 'Please enter receipt data');
    return;
  }

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const response = await fetch(`${API_BASE}/print/receipt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
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

// Preview Label
function previewLabel() {
  const data = document.getElementById('label-data').value;
  const preview = document.getElementById('label-preview');

  if (!data) {
    preview.innerHTML = '<div class="preview-placeholder">Enter TSPL commands or use templates</div>';
    return;
  }

  // Parse TSPL commands for preview
  let html = parseTSPLForPreview(data);
  preview.innerHTML = html;
}

// Parse TSPL commands to HTML preview
function parseTSPLForPreview(data) {
  const lines = data.split('\n');
  let html = '';
  let sizeInfo = '';

  lines.forEach(line => {
    const trimmed = line.trim();

    if (trimmed.startsWith('SIZE')) {
      sizeInfo = trimmed.replace('SIZE ', '');
    } else if (trimmed.startsWith('TEXT')) {
      // TEXT x,y,"font",rotation,x-mul,y-mul,"content"
      const match = trimmed.match(/TEXT\s+\d+,\d+,"[^"]*",\d+,\d+,\d+,"([^"]*)"/);
      if (match) {
        html += `<div style="margin: 4px 0; font-weight: 500;">${escapeHtml(match[1])}</div>`;
      }
    } else if (trimmed.startsWith('BARCODE')) {
      html += '<div style="margin: 8px 0; padding: 4px; background: #000; color: white; font-family: monospace; text-align: center;">||||| BARCODE |||||</div>';
    }
  });

  if (sizeInfo) {
    html = `<div style="font-size: 10px; color: #64748b; margin-bottom: 8px;">${sizeInfo}</div>` + html;
  }

  return html || '<div class="preview-placeholder">Preview will appear here</div>';
}

// Print Label
async function printLabel() {
  const data = document.getElementById('label-data').value;
  const resultDiv = document.getElementById('label-result');

  if (!data) {
    showResult(resultDiv, 'error', 'Please enter label data');
    return;
  }

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const response = await fetch(`${API_BASE}/print/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
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

// Load label templates
async function loadLabelTemplates() {
  try {
    const response = await fetch(`${API_BASE}/label/templates`);
    const data = await response.json();

    if (data.status === 'ok') {
      availableTemplates = data.templates;
      renderTemplateOptions(data.templates);
    }
  } catch (error) {
    console.error('Failed to load label templates:', error);
  }
}

// Render template options in dropdown
function renderTemplateOptions(templates) {
  const select = document.getElementById('template-select');

  Object.keys(templates).forEach(key => {
    const template = templates[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.name;
    select.appendChild(option);
  });
}

// Handle template selection
function onTemplateSelect(templateName) {
  if (!templateName) {
    // Clear form
    document.getElementById('template-info').style.display = 'none';
    document.getElementById('template-fields-header').style.display = 'none';
    document.getElementById('template-fields').innerHTML = '';
    document.getElementById('template-actions').style.display = 'none';
    document.getElementById('template-preview').innerHTML = '<div class="preview-placeholder">Select a template to get started</div>';
    selectedTemplate = null;
    return;
  }

  const template = availableTemplates[templateName];
  if (!template) return;

  selectedTemplate = templateName;

  // Show template info
  document.getElementById('template-title').textContent = template.name;
  document.getElementById('template-description').textContent = template.description;
  document.getElementById('template-size').textContent = `Size: ${template.size.width}mm × ${template.size.height}mm`;
  document.getElementById('template-info').style.display = 'block';

  // Generate form fields
  generateTemplateFields(template.fields);

  // Show fields header and actions
  document.getElementById('template-fields-header').style.display = 'block';
  document.getElementById('template-actions').style.display = 'flex';

  // Update preview
  updateTemplatePreview(template);
}

// Generate dynamic form fields based on template
function generateTemplateFields(fields) {
  const container = document.getElementById('template-fields');
  container.innerHTML = '';

  fields.forEach(field => {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'template-field';

    const label = document.createElement('label');
    label.textContent = field.replace(/_/g, ' ');
    label.htmlFor = `field-${field}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `field-${field}`;
    input.name = field;
    input.placeholder = `Enter ${field.replace(/_/g, ' ')}`;
    input.required = true;

    // Add example values for specific fields
    if (field === 'price') {
      input.placeholder = 'e.g., Rs. 1999';
    } else if (field === 'date') {
      input.value = new Date().toLocaleDateString();
    } else if (field.includes('barcode') || field.includes('code') || field === 'sku' || field === 'tracking_number') {
      input.placeholder = 'e.g., 123456789';
    } else if (field === 'discount_percent') {
      input.placeholder = 'e.g., 40';
      input.type = 'number';
      input.min = '1';
      input.max = '100';
    } else if (field.includes('price')) {
      input.placeholder = 'e.g., 6349';
      input.type = 'number';
    }

    fieldDiv.appendChild(label);
    fieldDiv.appendChild(input);
    container.appendChild(fieldDiv);
  });

  // Attach listeners for live preview updates
  attachPreviewUpdateListeners();
}

// Update template preview with live data
function updateTemplatePreview(template) {
  const preview = document.getElementById('template-preview');

  // Check if we have data in the form fields
  const hasData = template.fields.some(field => {
    const input = document.getElementById(`field-${field}`);
    return input && input.value.trim();
  });

  if (hasData) {
    // Generate preview with actual data
    renderLivePreview(template);
  } else {
    // Show template info
    let html = `
      <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 8px;">
        ${template.size.width}mm × ${template.size.height}mm
      </div>
      <div style="font-weight: 600; margin-bottom: 8px;">${template.name}</div>
      <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">${template.description}</div>
      <div style="font-size: 11px; color: var(--text-secondary);">
        Required fields:
        <ul style="margin-top: 4px; padding-left: 20px;">
          ${template.fields.map(f => `<li>${f.replace(/_/g, ' ')}</li>`).join('')}
        </ul>
      </div>
    `;
    preview.innerHTML = html;
  }
}

// Render live preview with actual data from form
function renderLivePreview(template) {
  const preview = document.getElementById('template-preview');

  // Collect data from form
  const data = {};
  template.fields.forEach(field => {
    const input = document.getElementById(`field-${field}`);
    data[field] = input ? input.value.trim() : '';
  });

  // Generate realistic label preview
  let html = `
    <div style="border: 2px solid #333; padding: 8px; background: white; font-family: Arial, sans-serif; font-size: 9px; line-height: 1.3; position: relative;">
      <div style="font-size: 9px; font-weight: bold; text-align: center;">M/s RISHABH BOMBAY DYEING</div>
      <div style="font-size: 7px; text-align: center; margin-bottom: 8px;">Habsiguda, Hyderabad</div>
  `;

  // Add discount badge if applicable
  if (data.discount_percent) {
    html += `
      <div style="position: absolute; right: 12px; top: 12px; border: 1px solid #333; padding: 2px 4px; font-size: 8px; font-weight: bold;">
        ${escapeHtml(data.discount_percent)}%
      </div>
    `;
  }

  // Product name and size
  html += `
    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
      <div style="font-size: 12px; font-weight: bold;">${escapeHtml(data.product_name || 'Product Name')}</div>
      <div style="font-size: 9px;">${escapeHtml(data.size || '')}</div>
    </div>
  `;

  // Product type
  html += `
    <div style="font-size: 9px; margin-bottom: 6px;">${escapeHtml(data.product_type || 'Product Type')}</div>
  `;

  // Barcode representation (without duplicate text below)
  html += `
    <div style="margin: 8px 0; padding: 4px; background: #000; color: white; font-family: monospace; text-align: center; font-size: 8px; height: 30px; display: flex; align-items: center; justify-content: center;">
      |||| ${escapeHtml(data.barcode || 'BARCODE')} ||||
    </div>
  `;

  // Price section
  if (data.original_price && data.discounted_price) {
    html += `
      <div style="text-align: right; margin-top: 8px;">
        <div style="font-size: 8px; text-decoration: line-through;">Rs. ${escapeHtml(data.original_price)}/-</div>
        <div style="font-size: 13px; font-weight: bold;">Rs. ${escapeHtml(data.discounted_price)}/-</div>
      </div>
    `;
  } else if (data.price) {
    html += `
      <div style="text-align: right; margin-top: 8px; font-size: 13px; font-weight: bold;">Rs. ${escapeHtml(data.price)}/-</div>
    `;
  }

  html += `</div>`;

  preview.innerHTML = html;
}

// Update preview when user types
function attachPreviewUpdateListeners() {
  const inputs = document.querySelectorAll('.template-field input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const template = availableTemplates[selectedTemplate];
      if (template) {
        updateTemplatePreview(template);
      }
    });
  });
}

// Print label using template
async function printLabelTemplate() {
  const resultDiv = document.getElementById('template-result');

  if (!selectedTemplate) {
    showResult(resultDiv, 'error', 'Please select a template');
    return;
  }

  // Collect field data
  const template = availableTemplates[selectedTemplate];
  const data = {};
  let hasErrors = false;

  template.fields.forEach(field => {
    const input = document.getElementById(`field-${field}`);
    const value = input.value.trim();

    if (!value) {
      input.style.borderColor = 'var(--danger)';
      hasErrors = true;
    } else {
      input.style.borderColor = 'var(--border)';
      data[field] = value;
    }
  });

  if (hasErrors) {
    showResult(resultDiv, 'error', 'Please fill in all required fields');
    return;
  }

  const copies = parseInt(document.getElementById('template-copies').value) || 1;

  try {
    showResult(resultDiv, 'success', 'Sending print job...');

    const response = await fetch(`${API_BASE}/label`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: selectedTemplate,
        data,
        copies
      })
    });

    const result = await response.json();

    if (response.ok && result.status === 'ok') {
      showResult(resultDiv, 'success', `✓ Label print job sent! Job ID: ${result.jobId} (${result.copies} ${result.copies > 1 ? 'copies' : 'copy'})`);
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

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (statusInterval) {
    clearInterval(statusInterval);
  }
});
