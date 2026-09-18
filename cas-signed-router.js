/**
 * Additive BuTP CAS routes for the existing campus Express service.
 * Register this before existing /api/auth/cas/* handlers. Requests without
 * app=butp are passed to the existing service unchanged.
 */
const crypto = require('crypto');
const https = require('https');
const xml2js = require('xml2js');

const CAS_SERVER_URL = 'https://auth.bupt.edu.cn/authserver';
const CALLBACK_URL = 'http://10.3.58.3:8080/api/auth/cas/callback?app=butp';

function secretKey() {
  const secret = process.env.CAS_ASSERTION_SECRET || '';
  if (!/^[a-fA-F0-9]{64}$/.test(secret)) throw new Error('CAS_ASSERTION_SECRET must be 64 hex characters');
  return Buffer.from(secret, 'hex');
}

function sign(body) {
  return crypto.createHmac('sha256', secretKey()).update(body).digest('base64url');
}

function encodeSigned(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body)}`;
}

function decodeSigned(value) {
  const [body, signature, extra] = (value || '').split('.');
  if (!body || !signature || extra) return null;
  const expected = Buffer.from(sign(body));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

function readCookie(req, name) {
  const entry = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${name}=`));
  return entry ? entry.slice(name.length + 1) : null;
}

function messagePage(type, payload, origin) {
  const message = JSON.stringify({ type, ...payload }).replace(/</g, '\\u003c');
  const targetOrigin = JSON.stringify(origin).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><title>CAS认证</title></head><body><p>认证完成，正在返回网站...</p><script>if(window.opener){window.opener.postMessage(${message},${targetOrigin});setTimeout(()=>window.close(),500)}else{document.body.textContent='请关闭此窗口并返回网站'}</script></body></html>`;
}

function validateTicket(ticket) {
  const url = new URL(`${CAS_SERVER_URL}/serviceValidate`);
  url.searchParams.set('service', CALLBACK_URL);
  url.searchParams.set('ticket', ticket);
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 15000, headers: { Accept: 'application/xml' } }, response => {
      let xml = '';
      response.setEncoding('utf8');
      response.on('data', chunk => {
        xml += chunk;
        if (xml.length > 65536) request.destroy(new Error('CAS response too large'));
      });
      response.on('end', async () => {
        if (response.statusCode !== 200) return reject(new Error(`CAS HTTP ${response.statusCode}`));
        try {
          const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
          const success = parsed['cas:serviceResponse']?.['cas:authenticationSuccess'];
          const userId = success?.['cas:user'];
          if (typeof userId !== 'string' || !userId) return reject(new Error('CAS rejected ticket'));
          resolve({ userId, name: success['cas:attributes']?.['cas:name'] || '' });
        } catch (error) { reject(error); }
      });
    });
    request.on('timeout', () => request.destroy(new Error('CAS validation timed out')));
    request.on('error', reject);
  });
}

function registerButpCasSignedFlow(app) {
  const allowedOrigins = new Set((process.env.CAS_ALLOWED_ORIGINS || 'https://butp.tech,http://localhost:3000').split(','));

  app.get('/api/auth/cas/proxy-login', (req, res, next) => {
    if (req.query.app !== 'butp' || req.query.flow !== 'signed') return next();
    try {
      secretKey();
      const { state, origin } = req.query;
      if (typeof state !== 'string' || !/^[a-f0-9]{64}$/.test(state) || !allowedOrigins.has(origin)) {
        return res.status(400).send('Invalid BuTP CAS parameters');
      }
      const flow = encodeSigned({ state, origin, exp: Date.now() + 300000 });
      res.setHeader('Set-Cookie', `butp-cas-flow=${flow}; HttpOnly; SameSite=Lax; Path=/api/auth/cas; Max-Age=300`);
      return res.redirect(`${CAS_SERVER_URL}/login?service=${encodeURIComponent(CALLBACK_URL)}`);
    } catch (error) {
      console.error('BuTP signed CAS login unavailable:', error.message);
      return res.status(503).send('BuTP signed CAS login unavailable');
    }
  });

  app.get('/api/auth/cas/callback', async (req, res, next) => {
    if (req.query.app !== 'butp') return next();
    res.setHeader('Set-Cookie', 'butp-cas-flow=; HttpOnly; SameSite=Lax; Path=/api/auth/cas; Max-Age=0');
    res.setHeader('Cache-Control', 'no-store');
    let flow;
    try {
      flow = decodeSigned(readCookie(req, 'butp-cas-flow'));
      if (!flow || flow.exp < Date.now() || !allowedOrigins.has(flow.origin)) return res.status(400).send('BuTP CAS flow expired');
      const ticket = req.query.ticket;
      if (typeof ticket !== 'string' || !ticket) return res.status(400).send('Missing CAS ticket');
      const user = await validateTicket(ticket);
      const now = Date.now();
      const assertion = encodeSigned({
        iss: 'butp-cas-proxy', aud: 'butp.tech', sub: user.userId, name: user.name,
        state: flow.state, iat: now, exp: now + 60000, jti: crypto.randomUUID()
      });
      return res.send(messagePage('CAS_ASSERTION', { assertion }, flow.origin));
    } catch (error) {
      console.error('BuTP signed CAS callback failed:', error.message);
      if (flow && allowedOrigins.has(flow.origin)) {
        return res.status(502).send(messagePage('CAS_ERROR', { error: 'cas_validation_failed' }, flow.origin));
      }
      return res.status(502).send('BuTP CAS validation failed');
    }
  });
}

module.exports = registerButpCasSignedFlow;
