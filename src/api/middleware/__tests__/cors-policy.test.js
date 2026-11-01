const { isAllowedOrigin } = require('../cors-policy');

describe('isAllowedOrigin', () => {
  test.each([
    [undefined, 'no Origin (curl, same-origin dashboard)'],
    ['https://pos.mypopup.shop', 'POS'],
    ['https://dashboard.mypopup.shop', 'dashboard'],
    ['https://mypopup.shop', 'apex'],
    ['https://khoj.getpopup.in', 'legacy domain store'],
    ['http://localhost:3000', 'local dev'],
    ['http://pos.localhost:3000', 'local dev subdomain'],
    ['http://127.0.0.1:6319', 'loopback IP'],
    ['https://192.168.1.11:6320', '192.168/16'],
    ['http://10.0.0.4', '10/8'],
    ['http://172.20.1.2:8080', '172.16/12'],
  ])('allows %s (%s)', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(true);
  });

  test.each([
    ['https://evil.example', 'unrelated site'],
    ['https://localhost.evil.example', 'localhost look-alike'],
    ['https://192.168.1.5.evil.example', 'private-IP look-alike'],
    ['https://mypopup.shop.evil.example', 'popup look-alike'],
    ['https://evilmypopup.shop', 'suffix without a dot boundary'],
    ['http://172.32.0.1', 'just outside 172.16/12'],
    ['http://8.8.8.8', 'public IP'],
    ['null', 'opaque origin (sandboxed iframe, file://)'],
    ['ftp://192.168.1.2', 'non-http scheme'],
  ])('rejects %s (%s)', (origin) => {
    expect(isAllowedOrigin(origin)).toBe(false);
  });
});
