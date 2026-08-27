const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

let pool = null;
if (connectionString) {
  pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DB_POOL_MAX || 10),
  });
}

function isDatabaseConfigured() {
  return Boolean(pool);
}

async function query(text, params) {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  return pool.query(text, params);
}

async function closeDatabase() {
  if (pool) await pool.end();
}

module.exports = { query, isDatabaseConfigured, closeDatabase };
