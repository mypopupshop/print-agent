const { PNG } = require('pngjs');
const logger = require('../../utils/logger');

const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A;

// Default thermal print width: 80mm head @ 203 DPI prints in 576-dot bands
// on the TM-T81/T20 family used by this agent. POS payloads may override.
const DEFAULT_WIDTH = 576;
const ALLOWED_WIDTHS = new Set([384, 512, 576, 832]);

// GS v 0 accepts up to 65535 rows in a single command, but TM-T81 firmware
// rejects very tall buffers — split into bands so any receipt height works.
const BAND_HEIGHT = 256;

let _browserPromise = null;

async function getBrowser() {
  if (_browserPromise) {
    try {
      const browser = await _browserPromise;
      if (browser.isConnected()) return browser;
    } catch {
      // fall through to relaunch
    }
    _browserPromise = null;
  }

  _browserPromise = (async () => {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    browser.on('disconnected', () => {
      if (_browserPromise) _browserPromise = null;
    });
    return browser;
  })().catch((err) => {
    _browserPromise = null;
    throw err;
  });

  return _browserPromise;
}

async function shutdownBrowser() {
  if (!_browserPromise) return;
  const p = _browserPromise;
  _browserPromise = null;
  try {
    const browser = await p;
    await browser.close();
    logger.debug('HTML renderer browser closed');
  } catch (err) {
    logger.warn(`Failed to close HTML renderer browser: ${err.message}`);
  }
}

function wrapHtml(htmlFragment, width) {
  // Wrap the POS fragment in a minimal shell so the screenshot is exactly
  // `width` dots wide on a white background. Font falls back to system-ui
  // when 'Plus Jakarta Sans' isn't installed on the print-agent machine.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:#fff;color:#000;}
body{width:${width}px;font-family:'Plus Jakarta Sans',system-ui,-apple-system,'Segoe UI',sans-serif;}
img{max-width:100%;height:auto;}
*{box-sizing:border-box;}
</style></head><body>${htmlFragment}</body></html>`;
}

async function renderHtmlToPng(html, width) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height: 100, deviceScaleFactor: 1 });

    // networkidle2 lets store logos / QR codes load; we cap the total wait
    // so a single dead image URL can't block the print queue.
    await page
      .setContent(wrapHtml(html, width), { waitUntil: 'networkidle2', timeout: 8000 })
      .catch((err) => {
        logger.warn(`HTML render did not reach network idle, capturing anyway: ${err.message}`);
      });

    return await page.screenshot({ type: 'png', fullPage: true, omitBackground: false });
  } finally {
    await page.close().catch(() => {});
  }
}

function pngToRasterBands(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  const { width, height, data } = png;

  // ESC/POS raster format requires width in whole bytes.
  const usableWidth = Math.floor(width / 8) * 8;
  if (usableWidth === 0) {
    throw new Error('Rendered image is empty');
  }
  const byteWidth = usableWidth / 8;

  const chunks = [Buffer.from([ESC, 0x40]), Buffer.from([ESC, 0x61, 0x00])];

  for (let bandStart = 0; bandStart < height; bandStart += BAND_HEIGHT) {
    const bandRows = Math.min(BAND_HEIGHT, height - bandStart);
    const bandBytes = Buffer.alloc(byteWidth * bandRows);

    for (let y = 0; y < bandRows; y++) {
      const rowOffset = (bandStart + y) * width * 4;
      for (let bx = 0; bx < byteWidth; bx++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const x = bx * 8 + bit;
          const idx = rowOffset + x * 4;
          const a = data[idx + 3];
          // Transparent pixels print as white so receipts with rounded
          // corners / alpha icons don't render as solid black.
          const grey = a === 0
            ? 255
            : (data[idx] * 299 + data[idx + 1] * 587 + data[idx + 2] * 114) / 1000;
          if (grey < 128) byte |= (0x80 >> bit);
        }
        bandBytes[y * byteWidth + bx] = byte;
      }
    }

    const xL = byteWidth & 0xff;
    const xH = (byteWidth >> 8) & 0xff;
    const yL = bandRows & 0xff;
    const yH = (bandRows >> 8) & 0xff;
    chunks.push(Buffer.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]));
    chunks.push(bandBytes);
  }

  // Trailing feed so the receipt isn't cut flush against the last printed row.
  chunks.push(Buffer.from([LF, LF, LF, LF]));
  return Buffer.concat(chunks);
}

async function renderHtmlToEscpos(html, options = {}) {
  if (typeof html !== 'string' || html.length === 0) {
    throw new Error('html must be a non-empty string');
  }

  const width = options.width || DEFAULT_WIDTH;
  if (!ALLOWED_WIDTHS.has(width)) {
    throw new Error(`Unsupported width ${width}; allowed: ${Array.from(ALLOWED_WIDTHS).join(', ')}`);
  }

  const startedAt = Date.now();
  const png = await renderHtmlToPng(html, width);
  const renderMs = Date.now() - startedAt;

  const escpos = pngToRasterBands(png);
  logger.debug(`HTML→ESC/POS: ${html.length}B html → ${png.length}B png → ${escpos.length}B raster (${renderMs}ms render)`);
  return escpos;
}

module.exports = { renderHtmlToEscpos, shutdownBrowser };
