const fs = require('fs').promises;
const fsSync = require('fs');
const Joi = require('joi');
const path = require('path');
const { app } = require('electron');
const logger = require('../utils/logger');

const userBaseDir = app && app.isPackaged ? app.getPath('userData') : process.cwd();
const bundledConfigPath = path.join(app.getAppPath(), 'config', 'config.json');

// Configuration schema validation
const configSchema = Joi.object({
  epson: Joi.string().required(),
  tsc: Joi.string().required(),
  a4: Joi.string().required(),
  port: Joi.number().integer().min(1).max(65535).default(6319),
  logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  retryAttempts: Joi.number().integer().min(0).max(10).default(3),
  retryDelay: Joi.number().integer().min(100).default(2000),
  queueConcurrency: Joi.number().integer().min(1).max(10).default(1),
  dbfPath: Joi.string().allow('').default('')
});

function getConfigPath() {
  return path.join(userBaseDir, 'config', 'config.json');
}

/**
 * Load and validate configuration from config.json
 * @returns {Promise<Object>} Validated configuration object
 */
async function loadConfig() {
  const configPath = getConfigPath();

  try {
    // Check if config file exists
    try {
      await fs.access(configPath);
    } catch (err) {
      // First run in packaged app: copy bundled default if available
      if (app.isPackaged && fsSync.existsSync(bundledConfigPath)) {
        logger.info('Seeding user config from bundled default');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.copyFile(bundledConfigPath, configPath);
      } else {
        logger.warn('Config file not found, creating default config.json');
        const defaultConfig = await createDefaultConfig(configPath);
        return defaultConfig;
      }
    }

    // Read config file
    const rawData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(rawData);

    // Validate against schema
    const { error, value } = configSchema.validate(config, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(d => d.message).join(', ');
      throw new Error(`Invalid configuration: ${errors}`);
    }

    logger.info('Configuration loaded successfully');
    return value;

  } catch (err) {
    if (err.name === 'SyntaxError') {
      logger.error('Config file contains invalid JSON');
      throw new Error('CONFIG_ERROR: Invalid JSON in config.json');
    }
    throw err;
  }
}

/**
 * Create default configuration file
 * @param {string} configPath - Path to config file
 * @returns {Promise<Object>} Default configuration
 */
async function createDefaultConfig(configPath) {
  const defaultConfig = {
    epson: 'EPSON_TM_M30',
    tsc: 'TSC_TTP_244',
    a4: 'Canon_LBP2900',
    port: 6319,
    logLevel: 'info',
    retryAttempts: 3,
    retryDelay: 2000,
    queueConcurrency: 1,
    dbfPath: ''
  };

  // Ensure config directory exists
  const configDir = path.dirname(configPath);
  await fs.mkdir(configDir, { recursive: true });

  // Write default config
  await fs.writeFile(
    configPath,
    JSON.stringify(defaultConfig, null, 2),
    'utf-8'
  );

  logger.info('Default config.json created');
  return defaultConfig;
}

/**
 * Watch configuration file for changes and reload
 * @param {Function} onReload - Callback function called when config is reloaded
 */
/**
 * Persist updates to the user's config.json. Performs a merge against the
 * current on-disk config, validates against the schema, and writes atomically.
 * @param {Object} updates - Partial config values to merge
 * @returns {Promise<Object>} The merged, validated config
 */
async function saveConfig(updates) {
  const configPath = getConfigPath();

  let current = {};
  try {
    const raw = await fs.readFile(configPath, 'utf-8');
    current = JSON.parse(raw);
  } catch (err) {
    if (err.code !== 'ENOENT') throw err;
  }

  const merged = { ...current, ...updates };

  const { error, value } = configSchema.validate(merged, {
    abortEarly: false,
    stripUnknown: true
  });
  if (error) {
    const msg = error.details.map(d => d.message).join(', ');
    throw new Error(`Invalid configuration: ${msg}`);
  }

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  const tmpPath = configPath + '.tmp';
  await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), 'utf-8');
  await fs.rename(tmpPath, configPath);

  logger.info('Configuration saved');
  return value;
}

function watchConfig(onReload) {
  const configPath = getConfigPath();

  fs.watch(configPath, { persistent: false }, async (eventType) => {
    if (eventType === 'change') {
      try {
        logger.info('Config file changed, reloading...');
        const newConfig = await loadConfig();
        onReload(newConfig);
      } catch (err) {
        logger.error('Failed to reload config:', err.message);
      }
    }
  });

  logger.info('Watching config file for changes');
}

module.exports = {
  loadConfig,
  saveConfig,
  watchConfig
};
