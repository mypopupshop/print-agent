const { execSync } = require('child_process');
const BasePrinter = require('./base-printer');
const logger = require('../../utils/logger');
const ErrorCodes = require('../../utils/error-codes');
const { sendRawToPrinter } = require('./raw-print-helper');

/**
 * ESC/POS Printer implementation for Epson thermal printers
 * Supports raw ESC/POS command passthrough
 * Uses Windows printer queue (fallback from USB)
 */
class ESCPOSPrinter extends BasePrinter {
  constructor(deviceName, config) {
    super(deviceName, config);
  }

  /**
   * Connect to Windows printer queue
   * Verify printer exists using PowerShell
   */
  async connect() {
    try {
      // Use PowerShell to verify printer exists
      const cmd = `powershell.exe -Command "Get-Printer -Name '${this.deviceName}' -ErrorAction Stop | Select-Object -ExpandProperty Name"`;
      const result = execSync(cmd, { encoding: 'utf8' }).trim();

      if (!result || !result.includes(this.deviceName)) {
        throw new Error(`Printer "${this.deviceName}" not found in system`);
      }

      this.isConnected = true;
      logger.info(`ESC/POS printer "${this.deviceName}" connected`);
    } catch (error) {
      logger.error(`Failed to connect to ESC/POS printer: ${error.message}`);
      this.isConnected = false;
      throw new Error(ErrorCodes.PRINTER_OFFLINE);
    }
  }

  /**
   * Print raw ESC/POS commands to thermal printer
   * @param {string|Buffer|Object} data - Raw ESC/POS data
   */
  async print(data) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const startTime = Date.now();
      let buffer;

      // Handle different data formats
      if (typeof data === 'string') {
        // Assume base64 encoded or plain text
        if (this.isBase64(data)) {
          buffer = Buffer.from(data, 'base64');
        } else {
          buffer = Buffer.from(data, 'utf-8');
        }
      } else if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === 'object' && data.raw) {
        // Object with raw property
        buffer = Buffer.from(data.raw, 'base64');
      } else {
        throw new Error('Invalid data format for ESC/POS printer');
      }

      // Use raw print helper to send bytes directly to Windows printer API
      await sendRawToPrinter(this.deviceName, buffer);

      logger.debug(`ESC/POS job sent to "${this.deviceName}"`);

      this.updateLastUsed();
      const duration = Date.now() - startTime;

      logger.debug(`ESC/POS print completed in ${duration}ms`);

    } catch (error) {
      logger.error(`ESC/POS print error: ${error.message}`);
      this.isConnected = false;
      throw new Error(ErrorCodes.PRINT_FAILED);
    }
  }

  /**
   * Check if string is base64 encoded
   */
  isBase64(str) {
    try {
      return Buffer.from(str, 'base64').toString('base64') === str;
    } catch {
      return false;
    }
  }

  /**
   * Check printer status
   */
  async checkStatus() {
    return {
      online: this.isConnected,
      deviceName: this.deviceName,
      lastUsed: this.lastUsed
    };
  }

  /**
   * Disconnect from printer
   */
  async disconnect() {
    this.isConnected = false;
    logger.info(`ESC/POS printer "${this.deviceName}" disconnected`);
  }
}

module.exports = ESCPOSPrinter;
