const fs = require('fs');
const path = require('path');
const selfsigned = require('selfsigned');
const logger = require('./logger');

const CERTS_DIR = path.join(__dirname, '../../config/certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.crt');

/**
 * Generate a self-signed certificate valid for local network IPs.
 * Uses selfsigned (pure JS, no openssl binary needed).
 */
function generateCert() {
  if (!fs.existsSync(CERTS_DIR)) {
    fs.mkdirSync(CERTS_DIR, { recursive: true });
  }

  logger.info('Generating self-signed SSL certificate for local network...');

  // Build SAN altNames for localhost + all local IPs
  const altNames = [
    { type: 2, value: 'localhost' },           // DNS
    { type: 7, ip: '127.0.0.1' },              // IP
  ];

  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        altNames.push({ type: 7, ip: iface.address });
      }
    }
  }

  try {
    const pems = selfsigned.generate(
      [{ name: 'commonName', value: 'PrintAgent' }],
      {
        keySize: 2048,
        days: 3650,
        algorithm: 'sha256',
        extensions: [
          {
            name: 'subjectAltName',
            altNames,
          },
        ],
      }
    );

    fs.writeFileSync(KEY_PATH, pems.private);
    fs.writeFileSync(CERT_PATH, pems.cert);

    const ipList = altNames.filter(a => a.ip).map(a => a.ip).join(', ');
    logger.info('SSL certificate generated (valid 10 years)');
    logger.info(`  Key:  ${KEY_PATH}`);
    logger.info(`  Cert: ${CERT_PATH}`);
    logger.info(`  IPs:  ${ipList}`);
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
