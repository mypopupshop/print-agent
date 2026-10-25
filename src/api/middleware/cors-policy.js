/**
 * Cross-origin policy for the local print agent.
 *
 * The agent listens on the shop LAN, so any web page the cashier's browser
 * opens can try to call it. Only the Popup web app, localhost dev servers and
 * pages served from the LAN itself may talk to it.
 *
 * Origins are matched on the PARSED hostname. The previous substring checks
 * (`origin.includes('localhost')`, an unanchored private-IP regex) also let
 * through look-alikes such as https://localhost.evil.example or
 * https://192.168.1.5.evil.example.
 */

const POPUP_DOMAINS = ['mypopup.shop', 'getpopup.in'];

// RFC 1918 private IPv4 ranges, anchored to the whole hostname.
const PRIVATE_IPV4 =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/;

/**
 * Is a browser Origin header allowed to call the agent?
 * @param {string|undefined} origin - Value of the Origin request header
 * @returns {boolean}
 */
function isAllowedOrigin(origin) {
  // No Origin: curl, the tray app, or the agent's own dashboard (same-origin GET).
  if (!origin) return true;

  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const host = url.hostname.toLowerCase();

  // Loopback, including dev subdomains such as pos.localhost / store.localhost.
  if (host === 'localhost' || host.endsWith('.localhost') || host === '127.0.0.1' || host === '[::1]') {
    return true;
  }

  // Popup web app (POS runs on pos.mypopup.shop; stores on <slug>.mypopup.shop).
  if (POPUP_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`))) return true;

  // Pages served from the shop LAN.
  return PRIVATE_IPV4.test(host);
}

/**
 * Options for the `cors` middleware. A disallowed origin is rejected with an
 * error (not just "no CORS headers") so even simple, non-preflighted requests
 * from other sites never reach a print route.
 */
const corsOptions = {
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
};

/**
 * Chrome Private Network Access: before a public https page (pos.mypopup.shop)
 * may call a private-network address (192.168.x.x, localhost), Chrome sends a
 * CORS preflight carrying `Access-Control-Request-Private-Network: true` and
 * requires `Access-Control-Allow-Private-Network: true` in the answer.
 *
 * Must run BEFORE `cors()`, which ends OPTIONS preflights itself.
 */
function privateNetworkAccess(req, res, next) {
  if (
    req.method === 'OPTIONS' &&
    req.headers['access-control-request-private-network'] === 'true' &&
    isAllowedOrigin(req.headers.origin)
  ) {
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
  }
  next();
}

module.exports = { isAllowedOrigin, corsOptions, privateNetworkAccess };
