/**
 * Abstract base class for all printer types
 * All printer implementations must extend this class
 */
class BasePrinter {
  constructor(deviceName, config) {
    if (new.target === BasePrinter) {
      throw new Error('BasePrinter is abstract and cannot be instantiated directly');
    }

    this.deviceName = deviceName;
    this.config = config;
    this.isConnected = false;
    this.lastUsed = null;
  }

  /**
   * Connect to the printer
   * Must be implemented by subclasses
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Disconnect from the printer
   * Must be implemented by subclasses
   */
  async disconnect() {
    throw new Error('disconnect() must be implemented by subclass');
  }

  /**
   * Print data to the printer
   * Must be implemented by subclasses
   * @param {any} data - Data to print (format depends on printer type)
   */
  async print(data) {
    throw new Error('print() must be implemented by subclass');
  }

  /**
   * Check printer status
   * Must be implemented by subclasses
   * @returns {Promise<Object>} Status object
   */
  async checkStatus() {
    throw new Error('checkStatus() must be implemented by subclass');
  }

  /**
   * Check if printer is online
   * @returns {boolean} True if connected
   */
  isOnline() {
    return this.isConnected;
  }

  /**
   * Get timestamp of last print job
   * @returns {number|null} Timestamp in milliseconds
   */
  getLastUsed() {
    return this.lastUsed;
  }

  /**
   * Update last used timestamp
   */
  updateLastUsed() {
    this.lastUsed = Date.now();
  }
}

module.exports = BasePrinter;
