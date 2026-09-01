const { query } = require('./db');

async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      email VARCHAR(320) NOT NULL UNIQUE,
      phone VARCHAR(40),
      role VARCHAR(40) NOT NULL DEFAULT 'customer',
      password_hash TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id VARCHAR(64) PRIMARY KEY,
      model VARCHAR(100) NOT NULL,
      year INTEGER NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      range_miles INTEGER NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'available',
      image_url TEXT,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(64) PRIMARY KEY,
      tracking_id VARCHAR(80) NOT NULL UNIQUE,
      vehicle_id VARCHAR(64) NOT NULL REFERENCES vehicles(id),
      user_id VARCHAR(64) REFERENCES users(id),
      customer_name VARCHAR(160) NOT NULL,
      customer_email VARCHAR(320) NOT NULL,
      customer_phone VARCHAR(40),
      total NUMERIC(12,2) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'received',
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS consignments (
      id VARCHAR(64) PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
      carrier VARCHAR(120),
      tracking_number VARCHAR(120),
      status VARCHAR(60) NOT NULL DEFAULT 'pending',
      origin VARCHAR(200),
      destination VARCHAR(200),
      estimated_delivery DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS tracking_events (
      id BIGSERIAL PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status VARCHAR(80) NOT NULL,
      note TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS requests (
      id VARCHAR(64) PRIMARY KEY,
      type VARCHAR(80) NOT NULL DEFAULT 'general',
      name VARCHAR(160) NOT NULL,
      email VARCHAR(320) NOT NULL,
      message TEXT NOT NULL DEFAULT '',
      status VARCHAR(40) NOT NULL DEFAULT 'received',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_orders_vehicle_id ON orders(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON tracking_events(order_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_requests_email ON requests(email);
  `);

  await query(`
    INSERT INTO vehicles (id, model, year, price, range_miles, status)
    VALUES
      ('tm-001', 'Model 3', 2026, 38990, 272, 'available'),
      ('tm-002', 'Model Y', 2026, 44990, 320, 'available'),
      ('tm-003', 'Model S', 2026, 79990, 410, 'available'),
      ('tm-004', 'Model X', 2026, 84990, 335, 'reserved')
    ON CONFLICT (id) DO NOTHING;
  `);
}

module.exports = { initializeDatabase };
