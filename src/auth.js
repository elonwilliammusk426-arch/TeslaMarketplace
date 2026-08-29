const crypto = require('node:crypto');

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function getSecret() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    throw new Error('AUTH_SECRET must be configured with at least 32 characters');
  }
  return process.env.AUTH_SECRET;
}

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [scheme, salt, hash] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !salt || !hash) return resolve(false);
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) return reject(error);
      const actual = Buffer.from(hash, 'hex');
      const expected = Buffer.from(derivedKey.toString('hex'), 'hex');
      resolve(actual.length === expected.length && crypto.timingSafeEqual(actual, expected));
    });
  });
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signToken(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  const [header, body, signature] = String(token || '').split('.');
  if (!header || !body || !signature) return null;
  const data = `${header}.${body}`;
  const expected = crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'Authentication required' });
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Administrator access required' });
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, requireAuth, requireAdmin };
