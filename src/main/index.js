const { app } = require('electron');
const logger = require('../utils/logger');
const { loadConfig } = require('../config/config-loader');
const { startAPIServer } = require('../api/server');
const printerPool = require('../services/printers/printer-pool');
const printQueue = require('../services/queue/print-queue');
const { createSystemTray } = require('./tray');
const { registerAutoStart } = require('./auto-start');

let server = null;
let tray = null;

/**
 * Initialize the Print Agent application
 */
async function initialize() {
  try {
    logger.info('=== Print Agent Starting ===');

    // 1. Load configuration
    logger.info('Loading configuration...');
    const config = await loadConfig();
    logger.info(`Configuration loaded (port: ${config.port})`);

    // 2. Initialize printer pool
    logger.info('Initializing printer pool...');
    await printerPool.initialize(config);

    // 3. Initialize print queue
    logger.info('Initializing print queue...');
    printQueue.initialize(config);

    // 4. Start API server
    logger.info(`Starting API server on port ${config.port}...`);
    server = await startAPIServer(config.port, config);

    // 5. Create system tray
    logger.info('Creating system tray...');
    tray = createSystemTray(config.port);

    // 6. Register auto-start
    logger.info('Registering auto-start...');
    await registerAutoStart();

    logger.info('=== Print Agent Started Successfully ===');
    logger.info(`API available at http://localhost:${config.port}`);

  } catch (error) {
    logger.error('Failed to initialize Print Agent:', error);
    app.quit();
    process.exit(1);
  }
}

/**
 * Cleanup and shutdown
 */
async function shutdown() {
  logger.info('=== Print Agent Shutting Down ===');

  try {
    // Close API server
    if (server) {
      server.close();
      logger.info('API server stopped');
    }

    // Pause print queue
    printQueue.pause();
    logger.info('Print queue paused');

    // Disconnect all printers
    await printerPool.shutdown();

    logger.info('=== Print Agent Stopped ===');

  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
}

// Electron app lifecycle

app.on('ready', async () => {
  logger.info('Electron app ready');

  // Don't show in dock on macOS
  if (app.dock) {
    app.dock.hide();
  }

  await initialize();
});

// Prevent app from quitting when all windows are closed
app.on('window-all-closed', (e) => {
  // Don't quit - this is a background app
  if (e) e.preventDefault();
});

// Quit when explicitly requested
app.on('before-quit', async () => {
  await shutdown();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection:', reason);
});

// Export for testing
module.exports = { initialize, shutdown };
