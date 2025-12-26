const fs = require('fs').promises;
const Joi = require('joi');
const path = require('path');
const logger = require('../utils/logger');

// Configuration schema validation
const configSchema = Joi.object({
  epson: Joi.string().required(),
  tsc: Joi.string().required(),
  a4: Joi.string().required(),
  port: Joi.number().integer().min(1).max(65535).default(6319),
  logLevel: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
  retryAttempts: Joi.number().integer().min(0).max(10).default(3),
  retryDelay: Joi.number().integer().min(100).default(2000),
  queueConcurrency: Joi.number().integer().min(1).max(10).default(1)
});

/**
 * Load and validate configuration from config.json
 * @returns {Promise<Object>} Validated configuration object
 */
async function loadConfig() {
  const configPath = path.join(process.cwd(), 'config', 'config.json');

  try {
    // Check if config file exists
    try {
      await fs.access(configPath);
    } catch (err) {
      // Config doesn't exist, create default
      logger.warn('Config file not found, creating default config.json');
      const defaultConfig = await createDefaultConfig(configPath);
      return defaultConfig;
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
    queueConcurrency: 1
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
function watchConfig(onReload) {
  const configPath = path.join(process.cwd(), 'config', 'config.json');

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
  watchConfig
};
