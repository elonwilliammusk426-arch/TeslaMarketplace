const express = require('express');
const helmet = require('helmet');
const { verifyToken } = require('./auth');
const { query } = require('./db');

function bearerToken(req) {
  const value = req.headers.authorization || '';
  return value.replace(/^Bearer\s+/i, '').trim();
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
  app.use(helmet());
  app.use(workflowGuard);
}

function requireConfiguredDatabase(req, res, next) {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    return res.status(503).json({ error: 'Service is not configured for production' });
  }
  next();
}

module.exports = { securityMiddleware, requireConfiguredDatabase };
