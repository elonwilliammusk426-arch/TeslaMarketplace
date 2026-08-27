const express = require('express');
const path = require('path');
const crypto = require('crypto');
const { securityMiddleware } = require('./src/security');

const app = express();
const PORT = process.env.PORT || 3000;

securityMiddleware(app);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Backend/API service: the frontend is deployed separately.
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'TeslaMarketplace API', timestamp: new Date().toISOString() });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TeslaMarketplace API', timestamp: new Date().toISOString() });
});

const vehicles = [
  { id: 'tm-001', model: 'Model 3', year: 2026, price: 38990, range: 272, status: 'available' },
  { id: 'tm-002', model: 'Model Y', year: 2026, price: 44990, range: 320, status: 'available' },
  { id: 'tm-003', model: 'Model S', year: 2026, price: 79990, range: 410, status: 'available' },
  { id: 'tm-004', model: 'Model X', year: 2026, price: 84990, range: 335, status: 'reserved' }
];
const requests = [];
const orders = [];

function createTrackingId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `TMX-${date}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

app.get('/api', (_req, res) => res.json({ name: 'TeslaMarketplace API', version: '1.2.0' }));
app.get('/api/vehicles', (_req, res) => res.json({ data: vehicles.filter(v => v.status !== 'draft') }));

app.get('/api/vehicles/:id', (req, res) => {
  const vehicle = vehicles.find(v => v.id === req.params.id);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  res.json({ data: vehicle });
});

app.post('/api/requests', (req, res) => {
  const { type = 'general', name, email, message = '' } = req.body || {};
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  const request = { id: `TM-${Date.now().toString(36).toUpperCase()}`, type, name, email, message, status: 'received', createdAt: new Date().toISOString() };
  requests.push(request);
  res.status(201).json({ data: request });
});

app.post('/api/purchase-requests', (req, res) => {
  const { vehicleId, name, email, phone = '', notes = '' } = req.body || {};
  const vehicle = vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });
  if (vehicle.status !== 'available') return res.status(409).json({ error: 'Vehicle is not currently available' });
  if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
  const order = { id: `TM-${Date.now().toString(36).toUpperCase()}`, trackingId: createTrackingId(), vehicleId, customer: { name, email, phone }, total: vehicle.price, status: 'received', tracking: [{ status: 'Order Received', note: 'Purchase request received by TeslaMarketplace.', createdAt: new Date().toISOString() }], notes, createdAt: new Date().toISOString() };
  orders.push(order);
  vehicle.status = 'reserved';
  res.status(201).json({ data: order });
});

app.get('/api/orders/track/:trackingId', (req, res) => {
  const order = orders.find(o => o.trackingId === req.params.trackingId);
  if (!order) return res.status(404).json({ error: 'Tracking ID not found' });
  res.json({ data: { trackingId: order.trackingId, status: order.status, vehicleId: order.vehicleId, total: order.total, tracking: order.tracking } });
});

app.get('/api/requests/:id', (req, res) => {
  const request = requests.find(r => r.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ data: request });
});

app.use((req, res) => res.status(404).json({ error: 'API route not found' }));
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'Internal server error' }); });

if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log(`TeslaMarketplace API listening on port ${PORT}`));
module.exports = app;
