const crypto = require('node:crypto');

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function requireSecret() {
  if (!SECRET || SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters');
  }
  return SECRET;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

function signToken(payload) {
  const secret = requireSecret();
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const secret = requireSecret();
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error('Invalid token');
  const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = await new Promise((resolve, reject) => crypto.scrypt(password, salt, 64, (err, key) => err ? reject(err) : resolve(key)));
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split(':');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const derived = await new Promise((resolve, reject) => crypto.scrypt(password, Buffer.from(saltHex, 'hex'), 64, (err, key) => err ? reject(err) : resolve(key)));
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.replace(/^Bearer\s+/i, '').trim();
}

function requireAuth(req, res, next) {
  try {
    req.user = verifyToken(bearerToken(req));
    next();
  } catch {
    res.status(401).json({ error: 'Authentication required' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, requireAuth, requireAdmin };
