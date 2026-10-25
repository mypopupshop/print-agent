const os = require('os');

/**
 * Non-internal IPv4 addresses of this machine (Wi-Fi, Ethernet, …).
 * These are the addresses other devices on the shop LAN can reach the agent at.
 * @returns {string[]}
 */
function getLanIPv4Addresses() {
  const addresses = [];
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

module.exports = { getLanIPv4Addresses };
