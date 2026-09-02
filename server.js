const { initializeDatabase } = require('./backend/src/init-db');
const { closeDatabase } = require('./backend/src/db');
const app = require('./backend/server');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production');
  }

  await initializeDatabase();

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`TeslaMarketplace API listening on port ${PORT}`);
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
