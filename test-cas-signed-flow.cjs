const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { EventEmitter } = require('node:events');
const https = require('node:https');
const { test } = require('node:test');

process.env.CAS_ASSERTION_SECRET = 'ab'.repeat(32);
const app = require('express')();
require('./cas-signed-router')(app);
app.get('/api/auth/cas/proxy-login', (_req, res) => res.send('existing login service'));
app.get('/api/auth/cas/callback', (_req, res) => res.send('existing callback service'));

test('signed flow validates CAS on the proxy and keeps the legacy route', async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const originalGet = https.get;
  let requestedUrl;
  https.get = (url, _options, callback) => {
    requestedUrl = url;
    const request = new EventEmitter();
    request.destroy = error => request.emit('error', error);
    queueMicrotask(() => {
      const response = new EventEmitter();
      response.statusCode = 200;
      response.setEncoding = () => {};
      callback(response);
      response.emit('data', "<cas:serviceResponse><cas:authenticationSuccess><cas:user>20230001</cas:user><cas:attributes><cas:name>Test User</cas:name></cas:attributes></cas:authenticationSuccess></cas:serviceResponse>");
      response.emit('end');
    });
    return request;
  };

  try {
    const state = '12'.repeat(32);
    const start = await fetch(`${base}/api/auth/cas/proxy-login?app=butp&flow=signed&state=${state}&origin=${encodeURIComponent('https://butp.tech')}`, { redirect: 'manual' });
    assert.equal(start.status, 302);
    assert.equal(new URL(start.headers.get('location')).searchParams.get('service'), 'http://10.3.58.3:8080/api/auth/cas/callback?app=butp');
    const cookie = start.headers.get('set-cookie').split(';')[0];
    const callback = await fetch(`${base}/api/auth/cas/callback?app=butp&ticket=ST-new`, { headers: { Cookie: cookie } });
    assert.equal(callback.status, 200);
    const html = await callback.text();
    assert.match(html, /CAS_ASSERTION/);
    assert.equal(requestedUrl.searchParams.get('service'), 'http://10.3.58.3:8080/api/auth/cas/callback?app=butp');
    const assertion = html.match(/"assertion":"([^"]+)"/)[1];
    const [body, signature] = assertion.split('.');
    assert.equal(signature, crypto.createHmac('sha256', Buffer.from(process.env.CAS_ASSERTION_SECRET, 'hex')).update(body).digest('base64url'));
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    assert.equal(payload.sub, '20230001');
    assert.equal(payload.state, state);

    const existingCallback = await fetch(`${base}/api/auth/cas/callback?app=another-service&ticket=ST-legacy`);
    assert.equal(await existingCallback.text(), 'existing callback service');
    const existingLogin = await fetch(`${base}/api/auth/cas/proxy-login?app=another-service`);
    assert.equal(await existingLogin.text(), 'existing login service');
  } finally {
    https.get = originalGet;
    await new Promise(resolve => server.close(resolve));
  }
});
