const crypto = require('node:crypto');
const { query } = require('./db');
const { canReadInventory, canWriteInventory, canDeleteInventory } = require('./roles');

const SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_TOKEN_LENGTH = 4096;
let roleSchemaReady = false;

function requireSecret() {
  if (!SECRET || SECRET.length < 32) {
    throw new Error('SESSION_SECRET must be set to a random value of at least 32 characters');
  }
  return SECRET;
}

function base64url(value) {
  return Buffer.from(value).toString('base64url');
}

async function ensureRoleSchema() {
  if (roleSchemaReady) return;
  await query(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('customer', 'viewer', 'manager', 'admin'));
  `);
  roleSchemaReady = true;
}

function signToken(payload) {
  const secret = requireSecret();
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({
    ...payload,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  const secret = requireSecret();
  const raw = String(token || '');
  if (!raw || raw.length > MAX_TOKEN_LENGTH) throw new Error('Invalid token');
  const parts = raw.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const [header, body, signature] = parts;
  let parsedHeader;
  let payload;
  try {
    parsedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw new Error('Invalid token');
  }
  if (parsedHeader?.alg !== 'HS256' || parsedHeader?.typ !== 'JWT') throw new Error('Invalid token');
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error('Invalid token');
  }
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.exp <= now || payload.exp - payload.iat > TOKEN_TTL_SECONDS) {
    throw new Error('Token expired');
  }
  if (!payload.userId) throw new Error('Invalid token');
  return payload;
}

async function hashPassword(password) {
  const value = String(password || '');
  const salt = crypto.randomBytes(16);
  const derived = await new Promise((resolve, reject) => crypto.scrypt(value, salt, 64, (err, key) => err ? reject(err) : resolve(key)));
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored || '').split(':');
  if (scheme !== 'scrypt' || !/^[0-9a-f]{32}$/i.test(saltHex || '') || !/^[0-9a-f]{128}$/i.test(hashHex || '')) return false;
  const derived = await new Promise((resolve, reject) => crypto.scrypt(String(password || ''), Buffer.from(saltHex, 'hex'), 64, (err, key) => err ? reject(err) : resolve(key)));
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
}

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.replace(/^Bearer\s+/i, '').trim();
}

async function authenticateRequest(req) {
  req.user = verifyToken(bearerToken(req));
  await ensureRoleSchema();
  const result = await query(`SELECT id, role FROM users WHERE id = $1`, [req.user.userId]);
  if (!result.rows[0]) throw new Error('User not found');
  // Never trust a stale role embedded in a long-lived token. Authorization uses the current DB role.
  req.user.role = result.rows[0].role;
}

function requireAuth(req, res, next) {
  authenticateRequest(req).then(() => next()).catch(() => {
    res.status(401).json({ error: 'Authentication required' });
  });
}

function requireAdmin(req, res, next) {
  const role = req.user?.role;
  const isInventoryRoute = req.path.startsWith('/api/admin/inventory');

  if (role === 'admin') return next();

  if (isInventoryRoute) {
    if (req.method === 'GET' && canReadInventory(req.user)) return next();
    if ((req.method === 'POST' || req.method === 'PATCH') && canWriteInventory(req.user)) return next();
    if (req.method === 'DELETE' && canDeleteInventory(req.user)) return next();
  }

  return res.status(403).json({ error: 'Insufficient permissions for this action' });
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  requireAuth,
  requireAdmin,
  ensureRoleSchema
};
