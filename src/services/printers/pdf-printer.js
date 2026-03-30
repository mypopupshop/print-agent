const puppeteer = require('puppeteer');
const pdfPrinter = require('pdf-to-printer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const BasePrinter = require('./base-printer');
const logger = require('../../utils/logger');
const ErrorCodes = require('../../utils/error-codes');

/**
 * PDF Printer implementation for A4 printers
 * Supports PDF and HTML→PDF conversion
 */
class PDFPrinter extends BasePrinter {
  constructor(deviceName, config) {
    super(deviceName, config);
    this.browser = null;
  }

  /**
   * Connect to PDF printer
   * Initialize headless browser for HTML→PDF conversion
   */
  async connect() {
    try {
      // Launch headless Chromium browser
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ]
      });

      this.isConnected = true;
      logger.info(`PDF printer "${this.deviceName}" ready (browser launched)`);

    } catch (error) {
      logger.error(`Failed to connect to PDF printer: ${error.message}`);
      this.isConnected = false;
      throw new Error(ErrorCodes.PRINTER_OFFLINE);
    }
  }

  /**
   * Print PDF or HTML to A4 printer
   * @param {Object} data - Print data with type (pdf/html), content, options
   */
  async print(data) {
    if (!this.isConnected || !this.browser) {
      await this.connect();
    }

    try {
      const startTime = Date.now();
      let pdfPath;

      // Determine data type and handle accordingly
      if (data.type === 'pdf' || data.pdfBase64) {
        // Direct PDF printing (base64 encoded)
        const content = data.content || data.pdfBase64;
        pdfPath = await this.savePDFFromBase64(content);

      } else if (data.type === 'html' || data.htmlContent) {
        // HTML → PDF conversion
        const htmlContent = data.content || data.htmlContent;
        const options = data.options || {};
        pdfPath = await this.convertHTMLToPDF(htmlContent, options);

      } else if (data.url) {
        // URL → PDF conversion
        const options = data.options || {};
        pdfPath = await this.convertURLToPDF(data.url, options);

      } else {
        throw new Error('Invalid data format: must specify type (pdf/html) or url');
      }

      // Print PDF to Windows printer
      const printOptions = {
        printer: this.deviceName,
        paperSize: data.paperSize || 'A4',
        scale: data.scale || 'fit',
        orientation: data.orientation || 'portrait'
      };

      await pdfPrinter.print(pdfPath, printOptions);

      // Cleanup temporary PDF file
      await fs.unlink(pdfPath).catch((err) => {
        logger.warn(`Failed to delete temp PDF: ${err.message}`);
      });

      this.updateLastUsed();
      const duration = Date.now() - startTime;

      logger.debug(`PDF print completed in ${duration}ms`);

    } catch (error) {
      logger.error(`PDF print error: ${error.message}`);
      throw new Error(ErrorCodes.PRINT_FAILED);
    }
  }

  /**
   * Save base64 PDF data to temporary file
   * @param {string} base64Data - Base64 encoded PDF
   * @returns {Promise<string>} Path to temp PDF file
   */
  async savePDFFromBase64(base64Data) {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const tempPath = path.join(os.tmpdir(), `print-${Date.now()}.pdf`);
      await fs.writeFile(tempPath, buffer);
      return tempPath;
    } catch (error) {
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }

  /**
   * Convert HTML string to PDF
   * @param {string} html - HTML content
   * @param {Object} options - PDF options
   * @returns {Promise<string>} Path to generated PDF
   */
  async convertHTMLToPDF(html, options = {}) {
    let page;

    try {
      page = await this.browser.newPage();

      // Determine wait strategy based on content
      // For static HTML (no external resources), use faster strategy
      const hasExternalResources = html.includes('http://') || html.includes('https://');
      const waitStrategy = hasExternalResources ? 'networkidle2' : 'domcontentloaded';

      // Use config timeouts if available, otherwise use defaults
      const defaultTimeout = hasExternalResources
        ? (this.config?.pdf?.externalResourceTimeout || 10000)
        : (this.config?.pdf?.staticHtmlTimeout || 3000);
      const timeout = options.timeout || defaultTimeout;

      // Set content with optimized wait strategy
      await page.setContent(html, {
        waitUntil: waitStrategy,
        timeout: timeout
      });

      // Generate PDF
      const pdfOptions = {
        path: path.join(os.tmpdir(), `print-${Date.now()}.pdf`),
        format: options.format || 'A4',
        margin: options.margin || {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true,
        preferCSSPageSize: options.preferCSSPageSize || false
      };

      await page.pdf(pdfOptions);
      await page.close();

      return pdfOptions.path;

    } catch (error) {
      if (page) {
        await page.close().catch(() => {});
      }
      throw new Error(`HTML to PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Convert URL to PDF
   * @param {string} url - URL to convert
   * @param {Object} options - PDF options
   * @returns {Promise<string>} Path to generated PDF
   */
  async convertURLToPDF(url, options = {}) {
    let page;

    try {
      page = await this.browser.newPage();

      // Navigate to URL with optimized wait strategy
      // networkidle2 is faster than networkidle0 (waits for 2+ network connections instead of 0)
      const waitStrategy = options.waitUntil || 'networkidle2';
      const timeout = options.timeout || this.config?.pdf?.urlTimeout || 15000;

      await page.goto(url, {
        waitUntil: waitStrategy,
        timeout: timeout
      });

      // Generate PDF
      const pdfOptions = {
        path: path.join(os.tmpdir(), `print-${Date.now()}.pdf`),
        format: options.format || 'A4',
        margin: options.margin || {
          top: '10mm',
          right: '10mm',
          bottom: '10mm',
          left: '10mm'
        },
        printBackground: true
      };

      await page.pdf(pdfOptions);
      await page.close();

      return pdfOptions.path;

    } catch (error) {
      if (page) {
        await page.close().catch(() => {});
      }
      throw new Error(`URL to PDF conversion failed: ${error.message}`);
    }
  }

  /**
   * Check printer status
   */
  async checkStatus() {
    return {
      online: this.isConnected && this.browser?.isConnected(),
      deviceName: this.deviceName,
      lastUsed: this.lastUsed
    };
  }

  /**
   * Disconnect from printer
   * Close headless browser
   */
  async disconnect() {
    if (this.browser) {
      try {
        await this.browser.close();
        logger.info(`PDF printer "${this.deviceName}" disconnected (browser closed)`);
      } catch (err) {
        logger.warn(`Error closing browser: ${err.message}`);
      }
      this.browser = null;
      this.isConnected = false;
    }
  }
}

module.exports = PDFPrinter;
