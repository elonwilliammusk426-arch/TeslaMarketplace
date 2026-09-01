const { query } = require('./db');
const { hashPassword } = require('./auth');

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
    INSERT INTO vehicles (id, model, year, price, range_miles, status, image_url, metadata)
    VALUES
      ('tm-001', 'Model 3', 2026, 38990, 363, 'available', 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1600&q=90', '{"body":"Sport Sedan","trim":"Long Range AWD","color":"Pearl White","drive":"AWD","description":"A streamlined electric sedan configured for long-distance efficiency and everyday driving."}'),
      ('tm-002', 'Model 3', 2026, 45990, 346, 'available', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=1600&q=90', '{"body":"Sport Sedan","trim":"Performance","color":"Ultra Red","drive":"AWD","description":"A performance-focused sedan with a sportier setup and distinctive red finish."}'),
      ('tm-003', 'Model Y', 2026, 44990, 321, 'available', 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1600&q=90', '{"body":"Midsize SUV","trim":"Long Range AWD","color":"Stealth Grey","drive":"AWD","description":"A versatile electric SUV designed around cargo space, comfort and road-trip range."}'),
      ('tm-004', 'Model Y', 2026, 52990, 327, 'available', 'https://images.unsplash.com/photo-1597007066704-67bf2068d5b2?auto=format&fit=crop&w=1600&q=90', '{"body":"Midsize SUV","trim":"Performance","color":"Deep Blue","drive":"AWD","description":"A sharper Model Y configuration combining utility with quicker acceleration and a blue exterior."}'),
      ('tm-005', 'Model Y L', 2026, 61990, 327, 'available', 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1600&q=90', '{"body":"Extended Midsize SUV","trim":"Premium","color":"Solid Black","drive":"AWD","description":"An extended Model Y configuration focused on passenger room, comfort and cargo flexibility."}'),
      ('tm-006', 'Model S', 2026, 79990, 410, 'available', 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1600&q=90', '{"body":"Full-size Sedan","trim":"Dual Motor","color":"Midnight Silver","drive":"AWD","description":"A premium electric sedan with long-range touring capability and a refined cabin."}'),
      ('tm-007', 'Model X', 2026, 84990, 335, 'reserved', 'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1600&q=90', '{"body":"SUV","trim":"Dual Motor","color":"Quicksilver","drive":"AWD","description":"A spacious premium SUV with distinctive rear doors and three-row flexibility."}'),
      ('tm-008', 'Cybertruck', 2026, 99990, 325, 'available', 'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=1600&q=90', '{"body":"Electric Pickup","trim":"Premium AWD","color":"Stainless Steel","drive":"AWD","description":"A stainless-steel electric pickup built around utility, towing and a distinctive angular design."}'),
      ('tm-009', 'Cybertruck', 2026, 119990, 325, 'available', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=90', '{"body":"Electric Pickup","trim":"Cyberbeast","color":"Satin Black","drive":"AWD","description":"A high-performance Cybertruck configuration with an aggressive dark presentation."}'),
      ('tm-010', 'Cybertruck', 2026, 89990, 320, 'available', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=90', '{"body":"Electric Pickup","trim":"Dual Motor AWD","color":"Silver","drive":"AWD","description":"A practical dual-motor electric pickup configuration with a silver presentation."}')
    ON CONFLICT (id) DO UPDATE SET model=EXCLUDED.model,year=EXCLUDED.year,price=EXCLUDED.price,range_miles=EXCLUDED.range_miles,status=EXCLUDED.status,image_url=EXCLUDED.image_url,metadata=EXCLUDED.metadata,updated_at=NOW();
  `);

  // Optional one-time owner provisioning. Credentials never live in source control.
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || '');
  const adminName = String(process.env.ADMIN_NAME || 'TeslaMarketplace Owner').trim();
  if (adminEmail || adminPassword) {
    if (!adminEmail || !adminPassword) throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be supplied together');
    if (adminPassword.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    const existing = await query(`SELECT id, role FROM users WHERE email=$1`, [adminEmail]);
    if (existing.rows.length === 0) {
      const passwordHash = await hashPassword(adminPassword);
      await query(`INSERT INTO users (id,name,email,role,password_hash) VALUES ($1,$2,$3,'admin',$4)`, [`owner-${Date.now().toString(36)}`, adminName, adminEmail, passwordHash]);
    } else if (existing.rows[0].role !== 'admin') {
      await query(`UPDATE users SET role='admin', updated_at=NOW() WHERE id=$1`, [existing.rows[0].id]);
    }
  }
}

module.exports = { initializeDatabase };
