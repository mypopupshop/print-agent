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
          // Convert ESCPOS placeholders to actual ESC/POS commands
          buffer = this.parseESCPOSCommands(data);
        }
      } else if (Buffer.isBuffer(data)) {
        buffer = data;
      } else if (typeof data === 'object' && data.raw) {
        // Object with raw property
        buffer = Buffer.from(data.raw, 'base64');
      } else {
        throw new Error('Invalid data format for ESC/POS printer');
      }

      // Ensure buffer ends with cut command
      buffer = this.ensureCutCommand(buffer);

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
   * Parse ESCPOS placeholder commands and convert to actual ESC/POS byte sequences
   * @param {string} text - Text with ESCPOS placeholders
   * @returns {Buffer} ESC/POS command buffer
   */
  parseESCPOSCommands(text) {
    const ESC = 0x1B;
    const GS = 0x1D;
    const LF = 0x0A;

    // Split by ESCPOS commands
    const parts = text.split(/(ESCPOS[A-Z]+)/);
    const bytes = [];

    parts.forEach(part => {
      if (part.startsWith('ESCPOS')) {
        // Handle ESCPOS commands
        switch (part) {
          case 'ESCPOSINITIALIZE':
          case 'ESCPOSINIT':
            bytes.push(ESC, 0x40); // ESC @ - Initialize printer
            break;
          case 'ESCPOSNEWLINE':
            bytes.push(LF); // Line feed
            break;
          case 'ESCPOSBOLDON':
            bytes.push(ESC, 0x45, 0x01); // ESC E 1 - Bold on
            break;
          case 'ESCPOSBOLDOFF':
            bytes.push(ESC, 0x45, 0x00); // ESC E 0 - Bold off
            break;
          case 'ESCPOSALIGNCT':
            bytes.push(ESC, 0x61, 0x01); // ESC a 1 - Center align
            break;
          case 'ESCPOSALIGNLT':
            bytes.push(ESC, 0x61, 0x00); // ESC a 0 - Left align
            break;
          case 'ESCPOSALIGNRT':
            bytes.push(ESC, 0x61, 0x02); // ESC a 2 - Right align
            break;
          case 'ESCPOSCUT':
            bytes.push(GS, 0x56, 0x00); // GS V 0 - Full cut
            break;
          case 'ESCPOSPARTIALCUT':
            bytes.push(GS, 0x56, 0x01); // GS V 1 - Partial cut
            break;
          default:
            // Unknown command, ignore
            logger.warn(`Unknown ESCPOS command: ${part}`);
        }
      } else if (part) {
        // Regular text - convert to bytes
        const textBytes = Buffer.from(part, 'utf-8');
        bytes.push(...textBytes);
      }
    });

    return Buffer.from(bytes);
  }

  /**
   * Ensure buffer ends with a cut command
   * @param {Buffer} buffer - Original buffer
   * @returns {Buffer} Buffer with cut command appended if needed
   */
  ensureCutCommand(buffer) {
    const GS = 0x1D;
    const cutCommand = Buffer.from([GS, 0x56, 0x00]); // GS V 0 - Full cut

    // Check if buffer already ends with cut command
    if (buffer.length >= 3) {
      const last3 = buffer.slice(-3);
      // Check for GS V 0 (full cut) or GS V 1 (partial cut)
      if (last3[0] === GS && last3[1] === 0x56 && (last3[2] === 0x00 || last3[2] === 0x01)) {
        return buffer; // Already has cut command
      }
    }

    // Append cut command
    logger.debug('Adding cut command to receipt');
    return Buffer.concat([buffer, cutCommand]);
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
