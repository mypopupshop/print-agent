const { execSync } = require('child_process');
const BasePrinter = require('./base-printer');
const logger = require('../../utils/logger');
const ErrorCodes = require('../../utils/error-codes');
const { sendRawToPrinter } = require('./raw-print-helper');

/**
 * TSPL/ZPL Printer implementation for TSC label printers
 * Supports raw TSPL and ZPL command passthrough
 * Uses PowerShell/Windows print queue
 */
class TSPLPrinter extends BasePrinter {
  constructor(deviceName, config) {
    super(deviceName, config);
  }

  /**
   * Connect to Windows printer queue
   * Verify printer exists in system using PowerShell
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
      logger.info(`TSPL printer "${this.deviceName}" ready`);

    } catch (error) {
      logger.error(`Failed to connect to TSPL printer: ${error.message}`);
      this.isConnected = false;
      throw new Error(ErrorCodes.PRINTER_NOT_FOUND);
    }
  }

  /**
   * Print raw TSPL/ZPL commands to label printer
   * @param {string|Buffer|Object} data - Raw TSPL/ZPL commands
   */
  async print(data) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const startTime = Date.now();
      let rawData;

      // Handle different data formats
      if (typeof data === 'string') {
        // Check if base64 or plain text
        if (this.isBase64(data)) {
          rawData = Buffer.from(data, 'base64');
        } else {
          // Plain text TSPL/ZPL commands
          rawData = Buffer.from(data, 'utf-8');
        }
      } else if (Buffer.isBuffer(data)) {
        rawData = data;
      } else if (typeof data === 'object') {
        if (data.raw) {
          rawData = Buffer.from(data.raw, 'base64');
        } else if (data.commands) {
          // Array of commands
          rawData = Buffer.from(data.commands.join('\n'), 'utf-8');
        } else {
          throw new Error('Invalid data format for TSPL printer');
        }
      } else {
        throw new Error('Invalid data format for TSPL printer');
      }

      // Use raw print helper to send bytes directly to Windows printer API
      await sendRawToPrinter(this.deviceName, rawData);

      logger.debug(`TSPL job sent to "${this.deviceName}"`);

      this.updateLastUsed();
      const duration = Date.now() - startTime;

      logger.debug(`TSPL print completed in ${duration}ms`);

    } catch (error) {
      logger.error(`TSPL print error: ${error.message}`);
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
   * Check printer status using PowerShell
   */
  async checkStatus() {
    try {
      const cmd = `powershell.exe -Command "Get-Printer -Name '${this.deviceName}' -ErrorAction Stop | Select-Object -ExpandProperty PrinterStatus"`;
      const status = execSync(cmd, { encoding: 'utf8' }).trim();

      return {
        online: this.isConnected && status.toLowerCase() !== 'offline',
        status: status || 'OK',
        deviceName: this.deviceName,
        lastUsed: this.lastUsed
      };
    } catch (error) {
      logger.error(`Failed to check TSPL printer status: ${error.message}`);
      return {
        online: false,
        status: 'ERROR',
        deviceName: this.deviceName,
        lastUsed: this.lastUsed
      };
    }
  }

  /**
   * Disconnect from printer
   * No persistent connection for Windows printer queue
   */
  async disconnect() {
    this.isConnected = false;
    logger.info(`TSPL printer "${this.deviceName}" disconnected`);
  }
}

module.exports = TSPLPrinter;
