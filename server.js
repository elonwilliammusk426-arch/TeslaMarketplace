const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const vehicles = [
  { id: 'tm-001', model: 'Model 3', year: 2026, price: 38990, range: 272, status: 'available' },
  { id: 'tm-002', model: 'Model Y', year: 2026, price: 44990, range: 320, status: 'available' },
  { id: 'tm-003', model: 'Model S', year: 2026, price: 79990, range: 410, status: 'available' },
  { id: 'tm-004', model: 'Model X', year: 2026, price: 84990, range: 335, status: 'reserved' }
];

const requests = [];

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'TeslaMarketplace', timestamp: new Date().toISOString() });
});

app.get('/api', (_req, res) => {
  res.json({ name: 'TeslaMarketplace API', version: '1.0.0' });
});

app.get('/api/vehicles', (_req, res) => res.json({ data: vehicles }));

app.get('/api/vehicles/:id', (req, res) => {
  const vehicle = vehicles.find((item) => item.id === req.params.id);
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

app.get('/api/requests/:id', (req, res) => {
  const request = requests.find((item) => item.id === req.params.id);
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ data: request });
});

app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/') && !path.extname(req.path)) {
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
  next();
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`TeslaMarketplace listening on port ${PORT}`));
