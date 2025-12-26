const ESCPOSPrinter = require('./escpos-printer');
const TSPLPrinter = require('./tspl-printer');
const PDFPrinter = require('./pdf-printer');
const logger = require('../../utils/logger');
const ErrorCodes = require('../../utils/error-codes');

/**
 * Printer Pool - Manages persistent connections to all configured printers
 * Singleton instance
 */
class PrinterPool {
  constructor() {
    this.printers = new Map();
    this.config = null;
  }

  /**
   * Initialize all printers from configuration
   * @param {Object} config - Application configuration
   */
  async initialize(config) {
    this.config = config;

    logger.info('Initializing printer pool...');

    // Define printer configurations
    const printerConfigs = [
      {
        type: 'epson',
        class: ESCPOSPrinter,
        deviceName: config.epson
      },
      {
        type: 'tsc',
        class: TSPLPrinter,
        deviceName: config.tsc
      },
      {
        type: 'a4',
        class: PDFPrinter,
        deviceName: config.a4
      }
    ];

    // Initialize each printer
    for (const { type, class: PrinterClass, deviceName } of printerConfigs) {
      try {
        logger.info(`Initializing ${type} printer: "${deviceName}"`);

        const printer = new PrinterClass(deviceName, config);
        await printer.connect();

        this.printers.set(type, printer);
        logger.info(`✓ ${type} printer "${deviceName}" initialized successfully`);

      } catch (error) {
        logger.error(`✗ Failed to initialize ${type} printer: ${error.message}`);
        // Continue with other printers - don't fail entire initialization
      }
    }

    const initializedCount = this.printers.size;
    logger.info(`Printer pool initialized with ${initializedCount}/3 printers`);
  }

  /**
   * Get printer instance by type
   * @param {string} type - Printer type (epson, tsc, a4)
   * @returns {Promise<BasePrinter>} Printer instance
   */
  async getPrinter(type) {
    const printer = this.printers.get(type);

    if (!printer) {
      throw new Error(`${ErrorCodes.PRINTER_NOT_CONFIGURED}: ${type}`);
    }

    // Check if printer is online, attempt reconnection if not
    if (!printer.isOnline()) {
      logger.warn(`Printer ${type} is offline, attempting reconnection...`);

      try {
        await printer.connect();
        logger.info(`Printer ${type} reconnected successfully`);
      } catch (error) {
        logger.error(`Failed to reconnect printer ${type}: ${error.message}`);
        throw new Error(`${ErrorCodes.PRINTER_OFFLINE}: ${type}`);
      }
    }

    return printer;
  }

  /**
   * Get all printers with their status
   * @returns {Promise<Array>} Array of printer info objects
   */
  async getAllPrinters() {
    const result = [];

    for (const [type, printer] of this.printers) {
      const status = await printer.checkStatus();

      result.push({
        type,
        name: printer.deviceName,
        online: printer.isOnline(),
        lastUsed: printer.getLastUsed(),
        status: status.status || 'OK'
      });
    }

    return result;
  }

  /**
   * Get printer types that are currently online
   * @returns {Array<string>} Array of printer types
   */
  getOnlinePrinters() {
    const online = [];

    for (const [type, printer] of this.printers) {
      if (printer.isOnline()) {
        online.push(type);
      }
    }

    return online;
  }

  /**
   * Reconnect a specific printer
   * @param {string} type - Printer type
   */
  async reconnectPrinter(type) {
    const printer = this.printers.get(type);

    if (!printer) {
      throw new Error(`Printer ${type} not configured`);
    }

    logger.info(`Reconnecting ${type} printer...`);

    try {
      await printer.disconnect();
      await printer.connect();
      logger.info(`Printer ${type} reconnected successfully`);
      return true;
    } catch (error) {
      logger.error(`Failed to reconnect ${type} printer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Shutdown all printers
   * Disconnect and cleanup resources
   */
  async shutdown() {
    logger.info('Shutting down printer pool...');

    for (const [type, printer] of this.printers) {
      try {
        await printer.disconnect();
        logger.info(`Printer ${type} disconnected`);
      } catch (error) {
        logger.error(`Error disconnecting ${type} printer: ${error.message}`);
      }
    }

    this.printers.clear();
    logger.info('Printer pool shutdown complete');
  }

  /**
   * Check if printer pool is initialized
   * @returns {boolean}
   */
  isInitialized() {
    return this.printers.size > 0;
  }

  /**
   * Get count of initialized printers
   * @returns {number}
   */
  getPrinterCount() {
    return this.printers.size;
  }
}

// Export singleton instance
module.exports = new PrinterPool();
