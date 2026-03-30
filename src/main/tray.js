const { Tray, Menu, shell, app, nativeImage } = require('electron');
const path = require('path');
const logger = require('../utils/logger');
const printerPool = require('../services/printers/printer-pool');
const printQueue = require('../services/queue/print-queue');

let tray = null;

/**
 * Create system tray icon and menu
 * @param {number} port - API server port
 * @returns {Tray} Tray instance
 */
function createSystemTray(port) {
  try {
    // Load tray icon
    const iconPath = path.join(__dirname, '..', '..', 'assets', 'icon.ico');

    // Create tray icon
    // For development: use a default icon if custom icon doesn't exist
    let icon;
    try {
      icon = nativeImage.createFromPath(iconPath);
    } catch (err) {
      // Fallback to default Electron icon
      logger.warn('Custom tray icon not found, using default');
      icon = nativeImage.createEmpty();
    }

    tray = new Tray(icon);

    // Set initial tooltip
    tray.setToolTip('Print Agent (Running)');

    // Build context menu
    updateTrayMenu(port);

    // Update menu periodically to show current status
    setInterval(() => {
      updateTrayMenu(port);
    }, 10000); // Every 10 seconds

    logger.info('System tray created');

    return tray;

  } catch (error) {
    logger.error('Failed to create system tray:', error);
    return null;
  }
}

/**
 * Update tray context menu
 * @param {number} port - API server port
 */
async function updateTrayMenu(port) {
  if (!tray) return;

  try {
    // Get printer statuses
    const printers = await printerPool.getAllPrinters();
    const queueStatus = printQueue.getStatus();
    const stats = printQueue.getStats();

    const onlinePrinters = printers.filter(p => p.online).length;
    const totalPrinters = printers.length;

    // Build menu template
    const menuTemplate = [
      {
        label: 'Print Agent v1.0.0',
        enabled: false
      },
      { type: 'separator' },
      {
        label: `Status: Running`,
        enabled: false
      },
      {
        label: 'Open Dashboard',
        click: () => {
          shell.openExternal(`http://localhost:${port}`);
        }
      },
      {
        label: `API: http://localhost:${port}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: `Printers: ${onlinePrinters}/${totalPrinters} online`,
        enabled: false
      }
    ];

    // Add individual printer status
    printers.forEach(printer => {
      menuTemplate.push({
        label: `  ${printer.online ? '✓' : '✗'} ${printer.name}`,
        enabled: false
      });
    });

    menuTemplate.push({ type: 'separator' });

    // Queue status
    menuTemplate.push({
      label: `Queue: ${stats.pending || 0} pending, ${stats.completed || 0} completed`,
      enabled: false
    });

    menuTemplate.push({ type: 'separator' });

    // Actions
    menuTemplate.push({
      label: 'Open Config Folder',
      click: () => {
        const configPath = path.join(process.cwd(), 'config');
        shell.openPath(configPath);
      }
    });

    menuTemplate.push({
      label: 'Open Logs Folder',
      click: () => {
        const logsPath = path.join(process.cwd(), 'logs');
        shell.openPath(logsPath);
      }
    });

    menuTemplate.push({ type: 'separator' });

    menuTemplate.push({
      label: 'Restart Service',
      click: () => {
        logger.info('Restart requested from tray menu');
        app.relaunch();
        app.quit();
      }
    });

    menuTemplate.push({
      label: 'Exit',
      click: () => {
        logger.info('Exit requested from tray menu');
        app.isQuitting = true;
        app.quit();
      }
    });

    // Update context menu
    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);

    // Update tooltip
    tray.setToolTip(`Print Agent - ${onlinePrinters}/${totalPrinters} printers online`);

  } catch (error) {
    logger.error('Failed to update tray menu:', error);
  }
}

/**
 * Destroy tray
 */
function destroyTray() {
  if (tray) {
    tray.destroy();
    tray = null;
    logger.info('System tray destroyed');
  }
}

module.exports = { createSystemTray, updateTrayMenu, destroyTray };
