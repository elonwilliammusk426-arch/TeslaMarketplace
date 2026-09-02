const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const { initializeDatabase } = require('./backend/src/init-db');
const { closeDatabase, isDatabaseConfigured } = require('./backend/src/db');
const app = require('./backend/server');

const PORT = Number(process.env.PORT) || 3000;
const frontendDist = path.join(__dirname, 'frontend', 'dist');

// The CI health tests import this module before the frontend build exists.
// Give the exported Express app a deterministic JSON 404 in that situation;
// production startup installs the React SPA fallback after the static assets.
if (!fs.existsSync(frontendDist)) {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });
}

async function start() {
  if (isDatabaseConfigured()) {
    try {
      await initializeDatabase();
      console.log('Database initialized.');
    } catch (error) {
      console.error('Database initialization failed; API may be unavailable:', error.message);
    }
  } else {
    console.warn('DATABASE_URL is not configured; frontend will still start.');
  }

  // Serve the production React build from the same Railway service as the API.
  app.use(express.static(frontendDist, { index: false, maxAge: '1h' }));
  app.get(/^(?!\/api(?:\/|$)|\/health$).*/, (req, res, next) => {
    res.sendFile(path.join(frontendDist, 'index.html'), (error) => {
      if (error) next(error);
    });
  });

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeslaMarketplace listening on port ${PORT}`);
  });

  const shutdown = async () => {
    server.close(async () => {
      await closeDatabase();
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Failed to start TeslaMarketplace:', error);
    process.exit(1);
  });
}

module.exports = app;
