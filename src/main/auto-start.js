const AutoLaunch = require('auto-launch');
const logger = require('../utils/logger');

let autoLauncher = null;

/**
 * Initialize auto-launch configuration
 */
function initializeAutoLaunch() {
  autoLauncher = new AutoLaunch({
    name: 'PrintAgent',
    path: process.execPath,
    isHidden: false, // Start visible to tray
  });

  return autoLauncher;
}

/**
 * Register application for auto-start on system boot
 */
async function registerAutoStart() {
  try {
    if (!autoLauncher) {
      initializeAutoLaunch();
    }

    // Check if already enabled
    const isEnabled = await autoLauncher.isEnabled();

    if (!isEnabled) {
      await autoLauncher.enable();
      logger.info('Auto-start registered successfully');
    } else {
      logger.info('Auto-start already enabled');
    }

    return true;

  } catch (error) {
    logger.error('Failed to register auto-start:', error);
    // Don't fail the app if auto-start registration fails
    return false;
  }
}

/**
 * Disable auto-start
 */
async function disableAutoStart() {
  try {
    if (!autoLauncher) {
      initializeAutoLaunch();
    }

    const isEnabled = await autoLauncher.isEnabled();

    if (isEnabled) {
      await autoLauncher.disable();
      logger.info('Auto-start disabled');
    }

    return true;

  } catch (error) {
    logger.error('Failed to disable auto-start:', error);
    return false;
  }
}

/**
 * Check if auto-start is enabled
 * @returns {Promise<boolean>}
 */
async function isAutoStartEnabled() {
  try {
    if (!autoLauncher) {
      initializeAutoLaunch();
    }

    return await autoLauncher.isEnabled();

  } catch (error) {
    logger.error('Failed to check auto-start status:', error);
    return false;
  }
}

module.exports = {
  registerAutoStart,
  disableAutoStart,
  isAutoStartEnabled
};
