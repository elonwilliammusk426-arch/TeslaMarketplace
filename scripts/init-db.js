const fs = require('node:fs/promises');
const path = require('node:path');
const { query, closeDatabase, isDatabaseConfigured } = require('../src/db');

async function main() {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is required to initialize PostgreSQL');
  const schema = await fs.readFile(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');
  await query(schema);
  console.log('TeslaMarketplace PostgreSQL schema initialized.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(closeDatabase);
