const express = require('express');
const crypto = require('crypto');
const { securityMiddleware } = require('./src/security');
const { query, isDatabaseConfigured, closeDatabase } = require('./src/db');
const { initializeDatabase } = require('./src/init-db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
securityMiddleware(app);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || process.env.CLIENT_ORIGIN || '')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
app.use((req, res, next) => {
  const origin = req.get('origin');
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

async function databaseReady() {
  if (!isDatabaseConfigured()) return false;
  await query('SELECT 1');
  return true;
}

app.get('/health', async (_req, res) => {
  try {
    await databaseReady();
    return res.status(200).json({ status: 'ok', service: 'TeslaMarketplace API', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({ status: 'degraded', service: 'TeslaMarketplace API', database: 'disconnected', error: 'Database unavailable' });
  }
});
app.get('/api/health', async (_req, res) => {
  try {
    await databaseReady();
    return res.status(200).json({ status: 'ok', service: 'TeslaMarketplace API', database: 'connected', timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    return res.status(503).json({ status: 'degraded', service: 'TeslaMarketplace API', database: 'disconnected', error: 'Database unavailable' });
  }
});

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}
function createTrackingId() {
  return `TMX-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}
function vehicleFromRow(row) {
  return {
    id: row.id,
    model: row.model,
    year: row.year,
    price: Number(row.price),
    range: row.range_miles,
    status: row.status,
    imageUrl: row.image_url || undefined,
    metadata: row.metadata || {}
  };
}
function orderFromRow(row, tracking = []) {
  return {
    id: row.id,
    trackingId: row.tracking_id,
    vehicleId: row.vehicle_id,
    customer: { name: row.customer_name, email: row.customer_email, phone: row.customer_phone || '' },
    total: Number(row.total),
    status: row.status,
    notes: row.notes || '',
    tracking,
    createdAt: row.created_at
  };
}

app.get('/api', (_req, res) => res.json({ name: 'TeslaMarketplace API', version: '2.0.0', persistence: 'postgresql' }));

app.get('/api/vehicles', async (_req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, model, year, price, range_miles, status, image_url, metadata FROM vehicles WHERE status <> 'draft' ORDER BY created_at, id`);
    res.json({ data: rows.map(vehicleFromRow) });
  } catch (error) { next(error); }
});

app.get('/api/vehicles/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, model, year, price, range_miles, status, image_url, metadata FROM vehicles WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ data: vehicleFromRow(rows[0]) });
  } catch (error) { next(error); }
});

app.post('/api/requests', async (req, res, next) => {
  try {
    const { type = 'general', name, email, message = '' } = req.body || {};
    if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
    const id = createId('TM');
    const { rows } = await query(`INSERT INTO requests (id, type, name, email, message) VALUES ($1, $2, $3, $4, $5) RETURNING id, type, name, email, message, status, created_at`, [id, type, name, email, message]);
    const r = rows[0];
    res.status(201).json({ data: { id: r.id, type: r.type, name: r.name, email: r.email, message: r.message, status: r.status, createdAt: r.created_at } });
  } catch (error) { next(error); }
});

app.get('/api/requests/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, type, name, email, message, status, created_at FROM requests WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Request not found' });
    const r = rows[0];
    res.json({ data: { id: r.id, type: r.type, name: r.name, email: r.email, message: r.message, status: r.status, createdAt: r.created_at } });
  } catch (error) { next(error); }
});

app.post('/api/purchase-requests', async (req, res, next) => {
  const client = await require('./src/db').getClient?.();
  try {
    const { vehicleId, name, email, phone = '', notes = '' } = req.body || {};
    if (!vehicleId || !name || !email) return res.status(400).json({ error: 'Vehicle ID, name and email are required' });

    const trackingId = createTrackingId();
    const orderId = createId('TM');
    const userId = createId('USR');

    if (!client) {
      return res.status(503).json({ error: 'Database unavailable' });
    }
    await client.query('BEGIN');
    const vehicleResult = await client.query(`SELECT id, price, status FROM vehicles WHERE id = $1 FOR UPDATE`, [vehicleId]);
    const vehicle = vehicleResult.rows[0];
    if (!vehicle) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Vehicle not found' });
    }
    if (vehicle.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Vehicle is not currently available' });
    }

    const userResult = await client.query(`INSERT INTO users (id, name, email, phone) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, updated_at = NOW() RETURNING id`, [userId, name, email, phone]);
    const actualUserId = userResult.rows[0].id;
    const now = new Date().toISOString();

    const orderResult = await client.query(`INSERT INTO orders (id, tracking_id, vehicle_id, user_id, customer_name, customer_email, customer_phone, total, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'received',$9) RETURNING id, tracking_id, vehicle_id, customer_name, customer_email, customer_phone, total, status, notes, created_at`, [orderId, trackingId, vehicleId, actualUserId, name, email, phone, vehicle.price, notes]);
    await client.query(`UPDATE vehicles SET status = 'reserved', updated_at = NOW() WHERE id = $1`, [vehicleId]);
    await client.query(`INSERT INTO tracking_events (order_id, status, note) VALUES ($1, $2, $3)`, [orderId, 'Order Received', 'Purchase request received by TeslaMarketplace.']);
    await client.query(`INSERT INTO consignments (id, order_id, status) VALUES ($1, $2, 'pending')`, [createId('CON') , orderId]);
    await client.query('COMMIT');

    const row = orderResult.rows[0];
    res.status(201).json({ data: orderFromRow(row, [{ status: 'Order Received', note: 'Purchase request received by TeslaMarketplace.', createdAt: now }]) });
  } catch (error) {
    if (client) { try { await client.query('ROLLBACK'); } catch (_) {} }
    next(error);
  } finally {
    if (client) client.release();
  }
});

app.get('/api/orders/track/:trackingId', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, tracking_id, vehicle_id, total, status FROM orders WHERE tracking_id = $1`, [req.params.trackingId]);
    if (!rows[0]) return res.status(404).json({ error: 'Tracking ID not found' });
    const events = await query(`SELECT status, note, created_at FROM tracking_events WHERE order_id = $1 ORDER BY created_at`, [rows[0].id]);
    res.json({ data: { trackingId: rows[0].tracking_id, status: rows[0].status, vehicleId: rows[0].vehicle_id, total: Number(rows[0].total), tracking: events.rows.map((e) => ({ status: e.status, note: e.note, createdAt: e.created_at })) } });
  } catch (error) { next(error); }
});

app.get('/api/orders/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, tracking_id, vehicle_id, customer_name, customer_email, customer_phone, total, status, notes, created_at FROM orders WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Order not found' });
    const events = await query(`SELECT status, note, created_at FROM tracking_events WHERE order_id = $1 ORDER BY created_at`, [req.params.id]);
    res.json({ data: orderFromRow(rows[0], events.rows.map((e) => ({ status: e.status, note: e.note, createdAt: e.created_at }))) });
  } catch (error) { next(error); }
});

app.get('/api/consignments/:id', async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT id, order_id, carrier, tracking_number, status, origin, destination, estimated_delivery, created_at, updated_at FROM consignments WHERE id = $1`, [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Consignment not found' });
    res.json({ data: rows[0] });
  } catch (error) { next(error); }
});

app.use((_req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

async function start() {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is required in production');
  await initializeDatabase();
  await databaseReady();
  const server = app.listen(PORT, '0.0.0.0', () => console.log(`TeslaMarketplace API listening on port ${PORT}`));
  const shutdown = async () => { server.close(async () => { await closeDatabase(); process.exit(0); }); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  start().catch((error) => { console.error('Failed to start TeslaMarketplace API:', error); process.exit(1); });
}

module.exports = app;
