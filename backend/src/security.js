const express = require('express');
const helmet = require('helmet');
const { verifyToken } = require('./auth');
const { query } = require('./db');

const buckets = new Map();
const WINDOW_MS = 60 * 1000;
const GENERAL_LIMIT = 120;
const AUTH_WINDOW_MS = 15 * 60 * 1000;
const AUTH_LIMIT = 12;
const PURCHASE_LIMIT = 8;

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.replace(/^Bearer\s+/i, '').trim();
}

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || req.ip || req.socket.remoteAddress || 'unknown';
}

function rateLimit(req, res, next) {
  const path = req.path;
  const isAuth = path === '/api/auth/login' || path === '/api/auth/register';
  const isPurchase = path === '/api/purchase-requests' || path === '/api/orders' || path === '/api/payments/create-checkout-session';
  const windowMs = isAuth ? AUTH_WINDOW_MS : WINDOW_MS;
  const limit = isAuth ? AUTH_LIMIT : (isPurchase ? PURCHASE_LIMIT : GENERAL_LIMIT);
  const key = `${clientKey(req)}:${isAuth ? 'auth' : isPurchase ? 'purchase' : 'general'}`;
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= windowMs) bucket = { startedAt: now, count: 0 };
  bucket.count += 1;
  buckets.set(key, bucket);
  if (buckets.size > 5000) {
    for (const [entryKey, entry] of buckets) {
      if (now - entry.startedAt >= windowMs) buckets.delete(entryKey);
    }
  }
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.startedAt + windowMs - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  return next();
}

function authenticate(req, res) {
  try {
    req.user = verifyToken(bearerToken(req));
    return true;
  } catch {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
}

function workflowGuard(req, res, next) {
  const isConfigurationCreate = req.method === 'POST' && req.path === '/api/configurations';
  const isOrderCreate = req.method === 'POST' && req.path === '/api/orders';
  const isCheckoutCreate = req.method === 'POST' && req.path === '/api/payments/create-checkout-session';

  if (!isConfigurationCreate && !isOrderCreate && !isCheckoutCreate) return next();

  express.json({ limit: '1mb' })(req, res, async (parseError) => {
    if (parseError) return next(parseError);
    if (!authenticate(req, res)) return;

    try {
      if (isConfigurationCreate) {
        req.body = req.body || {};
        req.body.userId = req.user.userId;
        return next();
      }

      if (isOrderCreate) {
        const configurationId = String(req.body?.configurationId || '').trim();
        if (!configurationId) return res.status(400).json({ error: 'configurationId is required' });

        const owner = await query(
          `SELECT c.id, c.user_id, u.email
             FROM configurations c
             LEFT JOIN users u ON u.id = c.user_id
            WHERE c.id = $1
              AND (c.user_id = $2 OR c.user_id IS NULL)`,
          [configurationId, req.user.userId]
        );
        if (!owner.rows[0]) return res.status(404).json({ error: 'Configuration not found' });

        req.body = req.body || {};
        req.body.email = owner.rows[0].email || req.body.email;
        if (!req.body.email) return res.status(400).json({ error: 'Account email is required' });
        return next();
      }

      const orderId = String(req.body?.orderId || '').trim();
      if (!orderId) return res.status(400).json({ error: 'orderId is required' });
      const owner = await query(
        `SELECT id FROM orders WHERE id = $1 AND user_id = $2`,
        [orderId, req.user.userId]
      );
      if (!owner.rows[0]) return res.status(404).json({ error: 'Order not found' });
      return next();
    } catch (error) {
      return next(error);
    }
  });
}

function securityMiddleware(app) {
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(rateLimit);
  app.use(workflowGuard);
}

function requireConfiguredDatabase(req, res, next) {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'Service is not configured for production' });
  }
  next();
}

module.exports = { securityMiddleware, requireConfiguredDatabase };
