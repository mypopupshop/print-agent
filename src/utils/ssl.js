const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const logger = require('./logger');

const CERTS_DIR = path.join(__dirname, '../../config/certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');

/**
 * Generate a self-signed certificate valid for local network IPs.
 * Uses openssl (available on macOS/Linux and Windows with Git).
 */
function generateCert() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  logger.info('Generating self-signed SSL certificate for local network...');

  // Build SAN entries for common local network ranges + localhost
  const sanEntries = [
    'DNS:localhost',
    'IP:127.0.0.1',
    'IP:0.0.0.0',
  ];

  // Add the machine's actual local IPs
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        sanEntries.push(`IP:${iface.address}`);
      }
    }
  }

  const san = sanEntries.join(',');

  try {
    execSync(
      `openssl req -x509 -newkey rsa:2048 -nodes ` +
      `-keyout "${KEY_PATH}" -out "${CERT_PATH}" ` +
      `-days 3650 -subj "/CN=PrintAgent" ` +
      `-addext "subjectAltName=${san}"`,
      { stdio: 'pipe' }
    );
    logger.info(`SSL certificate generated (valid 10 years)`);
    logger.info(`  Key:  ${KEY_PATH}`);
    logger.info(`  Cert: ${CERT_PATH}`);
    logger.info(`  SANs: ${san}`);
    return true;
  } catch (err) {
    logger.error('Failed to generate SSL certificate:', err.message);
    return false;
  }
}

/**
 * Load existing cert or generate a new one.
 * Returns { key, cert } buffers or null if unavailable.
 */
function loadOrCreateCert() {
  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH)) {
    logger.info('Loading existing SSL certificate');
    return {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    };
  }

  if (generateCert()) {
    return {
      key: fs.readFileSync(KEY_PATH),
      cert: fs.readFileSync(CERT_PATH),
    };
  }

  return null;
}

module.exports = { loadOrCreateCert, CERT_PATH, KEY_PATH };
