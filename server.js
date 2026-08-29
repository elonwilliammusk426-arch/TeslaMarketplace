const express = require('express');
const path = require('node:path');
const crypto = require('node:crypto');
const { z } = require('zod');
const { securityMiddleware, requireConfiguredDatabase } = require('./src/security');
const { query, isDatabaseConfigured } = require('./src/db');
const { hashPassword, verifyPassword, signToken, requireAuth, requireAdmin } = require('./src/auth');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || '';

securityMiddleware(app);
app.use((req, res, next) => {
  if (FRONTEND_ORIGIN && req.headers.origin === FRONTEND_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', FRONTEND_ORIGIN);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const credentialsSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(200)
});
const purchaseSchema = z.object({ vehicleId: z.string().min(1), name: z.string().trim().min(2).max(120).optional(), email: z.string().trim().email().max(320).optional(), phone: z.string().trim().max(40).optional(), notes: z.string().trim().max(2000).optional() });
const consignmentSchema = z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), vehicleDescription: z.string().trim().min(10).max(5000) });

app.get('/health', async (_req, res) => {
  try {
    const database = isDatabaseConfigured();
    if (database) await query('SELECT 1');
    res.json({ status: 'ok', service: 'TeslaMarketplace API', database: database ? 'connected' : 'not_configured', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'TeslaMarketplace API', database: 'unavailable' });
  }
});
app.get('/api/health', async (_req, res) => {
  try {
    const database = isDatabaseConfigured();
    if (database) await query('SELECT 1');
    res.json({ status: 'ok', service: 'TeslaMarketplace API', database: database ? 'connected' : 'not_configured', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', service: 'TeslaMarketplace API', database: 'unavailable' });
  }
});

app.get('/api', (_req, res) => res.json({ name: 'TeslaMarketplace API', version: '2.0.0' }));

app.post('/api/auth/register', requireConfiguredDatabase, async (req, res, next) => {
  try {
    const input = credentialsSchema.extend({ name: z.string().trim().min(2).max(120) }).parse(req.body);
    const existing = await query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [input.email]);
    if (existing.rowCount) return res.status(409).json({ error: 'An account with this email already exists' });
    const passwordHash = await hashPassword(input.password);
    const result = await query('INSERT INTO users (email, name, password_hash) VALUES ($1,$2,$3) RETURNING id,email,name,role,created_at', [input.email.toLowerCase(), input.name, passwordHash]);
    const user = result.rows[0];
    const token = signToken({ sub: String(user.id), email: user.email, role: user.role });
    res.status(201).json({ data: { user, token } });
  } catch (error) { next(error); }
});

app.post('/api/auth/login', requireConfiguredDatabase, async (req, res, next) => {
  try {
    const input = credentialsSchema.parse(req.body);
    const result = await query('SELECT id,email,name,password_hash,role FROM users WHERE LOWER(email)=LOWER($1)', [input.email]);
    if (!result.rowCount || !result.rows[0].password_hash || !(await verifyPassword(input.password, result.rows[0].password_hash))) return res.status(401).json({ error: 'Invalid email or password' });
    const user = result.rows[0];
    delete user.password_hash;
    const token = signToken({ sub: String(user.id), email: user.email, role: user.role });
    res.json({ data: { user, token } });
  } catch (error) { next(error); }
});

app.get('/api/auth/me', requireAuth, requireConfiguredDatabase, async (req, res, next) => {
  try {
    const result = await query('SELECT id,email,name,role,created_at FROM users WHERE id=$1', [req.user.sub]);
    if (!result.rowCount) return res.status(404).json({ error: 'User not found' });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/vehicles', requireConfiguredDatabase, async (_req, res, next) => {
  try {
    const result = await query('SELECT id,model,year,price,range_miles AS range,status,description,created_at FROM vehicles WHERE status <> $1 ORDER BY created_at DESC', ['draft']);
    res.json({ data: result.rows });
  } catch (error) { next(error); }
});

app.get('/api/vehicles/:id', requireConfiguredDatabase, async (req, res, next) => {
  try {
    const result = await query('SELECT id,model,year,price,range_miles AS range,status,description,created_at FROM vehicles WHERE id=$1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Vehicle not found' });
    res.json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

app.post('/api/orders', requireConfiguredDatabase, async (req, res, next) => {
  try {
    const input = purchaseSchema.parse(req.body);
    const clientResult = await query('SELECT id,model,price,status FROM vehicles WHERE id=$1', [input.vehicleId]);
    if (!clientResult.rowCount) return res.status(404).json({ error: 'Vehicle not found' });
    const vehicle = clientResult.rows[0];
    if (vehicle.status !== 'available') return res.status(409).json({ error: 'Vehicle is not currently available' });
    let userId = req.body.userId || null;
    if (req.headers.authorization) {
      try { const { verifyToken } = require('./src/auth'); const user = verifyToken(req.headers.authorization.replace(/^Bearer\s+/i, '')); if (user) userId = user.sub; } catch {}
    }
    const email = input.email || null;
    const orderId = `TM-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const trackingId = `TMX-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const created = await query('INSERT INTO orders (id,user_id,vehicle_id,tracking_id,status,total) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,tracking_id,status,total,created_at', [orderId, userId, vehicle.id, trackingId, 'received', vehicle.price]);
    await query('INSERT INTO tracking_events (order_id,tracking_id,status,note) VALUES ($1,$2,$3,$4)', [orderId, trackingId, 'Order Received', 'Purchase request received by TeslaMarketplace.']);
    await query('UPDATE vehicles SET status=$1 WHERE id=$2', ['reserved', vehicle.id]);
    res.status(201).json({ data: { ...created.rows[0], vehicle: { id: vehicle.id, model: vehicle.model }, customer: { name: input.name || null, email, phone: input.phone || null }, notes: input.notes || '' } });
  } catch (error) { next(error); }
});

app.get('/api/orders/track/:trackingId', requireConfiguredDatabase, async (req, res, next) => {
  try {
    const order = await query('SELECT id,tracking_id,status,vehicle_id,total,created_at FROM orders WHERE tracking_id=$1', [req.params.trackingId]);
    if (!order.rowCount) return res.status(404).json({ error: 'Tracking ID not found' });
    const events = await query('SELECT status,location,note,created_at FROM tracking_events WHERE tracking_id=$1 ORDER BY created_at ASC', [req.params.trackingId]);
    res.json({ data: { ...order.rows[0], tracking: events.rows } });
  } catch (error) { next(error); }
});

app.post('/api/consignments', requireConfiguredDatabase, async (req, res, next) => {
  try {
    const input = consignmentSchema.parse(req.body);
    const id = `CON-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const result = await query('INSERT INTO consignment_requests (id,name,email,vehicle_description) VALUES ($1,$2,$3,$4) RETURNING id,name,email,vehicle_description,status,created_at', [id,input.name,input.email.toLowerCase(),input.vehicleDescription]);
    res.status(201).json({ data: result.rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/admin/orders', requireAuth, requireAdmin, requireConfiguredDatabase, async (_req, res, next) => {
  try { const result = await query('SELECT * FROM orders ORDER BY created_at DESC'); res.json({ data: result.rows }); } catch (error) { next(error); }
});

app.get('/api/admin/consignments', requireAuth, requireAdmin, requireConfiguredDatabase, async (_req, res, next) => {
  try { const result = await query('SELECT * FROM consignment_requests ORDER BY created_at DESC'); res.json({ data: result.rows }); } catch (error) { next(error); }
});

app.use((req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  if (err instanceof z.ZodError) return res.status(400).json({ error: 'Invalid request', details: err.issues.map(issue => issue.message) });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`TeslaMarketplace API listening on port ${PORT}`));
module.exports = app;
