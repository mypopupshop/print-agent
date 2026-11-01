/**
 * HTTP-level checks for the POS-facing surface of the agent: CORS + Chrome
 * Private Network Access preflights, /health discovery info and job lookup.
 * Electron and the file logger are stubbed so the Express app runs in Node.
 */
const http = require('http');

jest.mock('electron', () => {
  const os = require('os');
  return { app: { isPackaged: false, getAppPath: () => os.tmpdir(), getPath: () => os.tmpdir() } };
});
jest.mock('../../utils/logger', () => ({
  info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(),
}));
// The DBF label importer isn't exercised here; don't require the native reader.
jest.mock('dbffile', () => ({ DBFFile: {} }), { virtual: true });

const { createServer } = require('../server');

let server;
let port;

beforeAll(async () => {
  const app = createServer({ port: 6319 });
  app.locals.httpPort = 6319;
  app.locals.httpsPort = 6320;
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  port = server.address().port;
});

afterAll(() => new Promise((resolve) => server.close(resolve)));

function request(method, path, headers = {}, body) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path, headers }, (res) => {
      let data = '';
      res.on('data', (c) => { data += c; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, headers: res.headers, json });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

const preflight = (origin) =>
  request('OPTIONS', '/print/receipt', {
    Origin: origin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
    'Access-Control-Request-Private-Network': 'true',
  });

describe('Private Network Access preflight', () => {
  test('answers the POS origin with Allow-Private-Network', async () => {
    const res = await preflight('https://pos.mypopup.shop');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://pos.mypopup.shop');
    expect(res.headers['access-control-allow-private-network']).toBe('true');
  });

  test('refuses a look-alike origin', async () => {
    const res = await preflight('https://pos.mypopup.shop.evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
    expect(res.headers['access-control-allow-private-network']).toBeUndefined();
  });
});

describe('GET /health', () => {
  test('reports liveness plus where else the agent can be reached', async () => {
    const res = await request('GET', '/health', { Origin: 'https://pos.mypopup.shop' });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({
      status: 'ok',
      agent: 'popup-print-agent',
      ports: { http: 6319, https: 6320 },
    });
    expect(Array.isArray(res.json.addresses)).toBe(true);
    expect(res.headers['access-control-allow-origin']).toBe('https://pos.mypopup.shop');
  });
});

describe('GET /network-info', () => {
  test('lists the https addresses to paste into the Popup POS', async () => {
    const res = await request('GET', '/network-info');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.json.posUrls)).toBe(true);
    for (const url of res.json.posUrls) expect(url).toMatch(/^https:\/\/[\d.]+:6320$/);
    expect(res.json.posUrls).toHaveLength(res.json.addresses.length);
  });
});

describe('GET /jobs/:jobId', () => {
  test('404s an unknown job', async () => {
    const res = await request('GET', '/jobs/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.json.error).toBe('JOB_NOT_FOUND');
  });
});

describe('POST /print/receipt validation', () => {
  test('rejects an html payload without html', async () => {
    const res = await request(
      'POST',
      '/print/receipt',
      { 'Content-Type': 'application/json' },
      JSON.stringify({ type: 'html' }),
    );
    expect(res.status).toBe(400);
    expect(res.json.error).toBe('INVALID_REQUEST');
  });
});
