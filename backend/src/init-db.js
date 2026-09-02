const { query } = require('./db');
const { hashPassword } = require('./auth');

const TESLA_ASSETS = {
  model3: 'https://digitalassets.tesla.com/tesla-contents/image/upload/h_2560,w_4096,c_fit,f_auto,q_auto:best/Homepage-Model-3-Desktop-LHD',
  modely: 'https://digitalassets.tesla.com/tesla-contents/image/upload/h_2400,w_2880,c_fit,f_auto,q_auto:best/Homepage-Model-Y-Global-Desktop',
  models: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Homepage-Model-S-Desktop-LHD-6.22.jpg',
  modelx: 'https://digitalassets.tesla.com/tesla-contents/image/upload/h_1800,w_2880,c_fit,f_auto,q_auto:best/Homepage-Model-X-Desktop-LHD',
  cybertruck: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Cybertruck-PLL-Pack-Desktop.png',
  charging: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Charging-Home-Charging.png',
  accessories: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Shop-Vehicle-Accessories.png',
  lifestyle: 'https://digitalassets.tesla.com/tesla-contents/image/upload/f_auto,q_auto/Mega-Menu-Shop-Lifestyle.png'
};

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
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(60) NOT NULL,
      price NUMERIC(12,2) NOT NULL,
      status VARCHAR(40) NOT NULL DEFAULT 'available',
      image_url TEXT,
      description TEXT NOT NULL DEFAULT '',
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
      carrier VARCHAR(120), tracking_number VARCHAR(120), status VARCHAR(60) NOT NULL DEFAULT 'pending',
      origin VARCHAR(200), destination VARCHAR(200), estimated_delivery DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS tracking_events (
      id BIGSERIAL PRIMARY KEY,
      order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      status VARCHAR(80) NOT NULL, note TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS requests (
      id VARCHAR(64) PRIMARY KEY,
      type VARCHAR(80) NOT NULL DEFAULT 'general', name VARCHAR(160) NOT NULL,
      email VARCHAR(320) NOT NULL, message TEXT NOT NULL DEFAULT '', status VARCHAR(40) NOT NULL DEFAULT 'received',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_orders_vehicle_id ON orders(vehicle_id);
    CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
    CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON tracking_events(order_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_requests_email ON requests(email);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  `);

  const vehicles = [
    ['tm-001','Model 3',2026,38990,363,'available',TESLA_ASSETS.model3,{body:'Sport Sedan',trim:'Long Range AWD',color:'Pearl White',drive:'AWD',gallery:[TESLA_ASSETS.model3,TESLA_ASSETS.model3],description:'Tesla Model 3 Long Range AWD configuration.'}],
    ['tm-002','Model 3',2026,45990,346,'available',TESLA_ASSETS.model3,{body:'Sport Sedan',trim:'Performance',color:'Ultra Red',drive:'AWD',gallery:[TESLA_ASSETS.model3,TESLA_ASSETS.model3],description:'Tesla Model 3 Performance configuration.'}],
    ['tm-003','Model Y',2026,44990,321,'available',TESLA_ASSETS.modely,{body:'Midsize SUV',trim:'Long Range AWD',color:'Stealth Grey',drive:'AWD',gallery:[TESLA_ASSETS.modely,TESLA_ASSETS.modely],description:'Tesla Model Y Long Range AWD configuration.'}],
    ['tm-004','Model Y',2026,52990,327,'available',TESLA_ASSETS.modely,{body:'Midsize SUV',trim:'Performance',color:'Deep Blue',drive:'AWD',gallery:[TESLA_ASSETS.modely,TESLA_ASSETS.modely],description:'Tesla Model Y Performance configuration.'}],
    ['tm-005','Model S',2026,79990,410,'available',TESLA_ASSETS.models,{body:'Full-size Sedan',trim:'Dual Motor',color:'Solid Black',drive:'AWD',gallery:[TESLA_ASSETS.models,TESLA_ASSETS.models],description:'Tesla Model S premium electric sedan.'}],
    ['tm-006','Model X',2026,84990,335,'available',TESLA_ASSETS.modelx,{body:'SUV',trim:'Dual Motor',color:'Quicksilver',drive:'AWD',gallery:[TESLA_ASSETS.modelx,TESLA_ASSETS.modelx],description:'Tesla Model X premium electric SUV.'}],
    ['tm-007','Cybertruck',2026,99990,325,'available',TESLA_ASSETS.cybertruck,{body:'Electric Pickup',trim:'AWD',color:'Stainless Steel',drive:'AWD',gallery:[TESLA_ASSETS.cybertruck,TESLA_ASSETS.cybertruck],description:'Tesla Cybertruck all-wheel-drive configuration.'}],
    ['tm-008','Cybertruck',2026,119990,325,'available',TESLA_ASSETS.cybertruck,{body:'Electric Pickup',trim:'Cyberbeast',color:'Stainless Steel',drive:'AWD',gallery:[TESLA_ASSETS.cybertruck,TESLA_ASSETS.cybertruck],description:'Tesla Cyberbeast high-performance configuration.'}],
    ['tm-009','Roadster',2026,0,'0','available',TESLA_ASSETS.model3,{body:'Sports Car',trim:'Future / In Development',color:'Tesla Red',drive:'—',gallery:[TESLA_ASSETS.model3],description:'Tesla Roadster is presented as a future/in-development vehicle; pricing is not listed.'}],
    ['tm-010','Model S',2025,64990,402,'available',TESLA_ASSETS.models,{body:'Full-size Sedan',trim:'Previous Generation / Used',color:'Pearl White',drive:'AWD',gallery:[TESLA_ASSETS.models],description:'Previous-generation Tesla Model S marketplace listing.'}],
    ['tm-011','Model X',2024,69990,335,'available',TESLA_ASSETS.modelx,{body:'SUV',trim:'Previous Generation / Used',color:'Solid Black',drive:'AWD',gallery:[TESLA_ASSETS.modelx],description:'Previous-generation Tesla Model X marketplace listing.'}]
  ];
  for (const [id,model,year,price,range,status,image,metadata] of vehicles) {
    await query(`INSERT INTO vehicles (id,model,year,price,range_miles,status,image_url,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (id) DO UPDATE SET model=EXCLUDED.model,year=EXCLUDED.year,price=EXCLUDED.price,range_miles=EXCLUDED.range_miles,status=EXCLUDED.status,image_url=EXCLUDED.image_url,metadata=EXCLUDED.metadata,updated_at=NOW()`,
      [id,model,year,Number(price),Number(range)||0,status,image,JSON.stringify(metadata)]);
  }

  // Remove every legacy third-party vehicle image from the catalog and normalize older rows to Tesla-only assets.
  await query(`UPDATE vehicles SET image_url=CASE WHEN LOWER(model) LIKE '%cybertruck%' THEN $1 WHEN LOWER(model) LIKE '%model 3%' THEN $2 WHEN LOWER(model) LIKE '%model y%' THEN $3 WHEN LOWER(model) LIKE '%model x%' THEN $4 WHEN LOWER(model) LIKE '%model s%' THEN $5 ELSE $3 END, updated_at=NOW() WHERE image_url IS NULL OR image_url !~* '(^|\\.)tesla\\.com/'`, [TESLA_ASSETS.cybertruck,TESLA_ASSETS.model3,TESLA_ASSETS.modely,TESLA_ASSETS.modelx,TESLA_ASSETS.models]);

  const products = [
    ['prd-charge-001','Wall Connector','charging',535,'available',TESLA_ASSETS.charging,'Tesla home charging equipment.'],
    ['prd-charge-002','Mobile Connector','charging',300,'available',TESLA_ASSETS.charging,'Portable Tesla charging equipment for everyday and travel use.'],
    ['prd-charge-003','Universal Wall Connector','charging',600,'available',TESLA_ASSETS.charging,'Tesla home charging solution with integrated J1772 adapter.'],
    ['prd-access-001','Model 3/Y Center Console Trays','accessories',75,'available',TESLA_ASSETS.accessories,'Interior organization accessories for Tesla vehicles.'],
    ['prd-access-002','Model Y All-Weather Interior Liners','accessories',225,'available',TESLA_ASSETS.accessories,'All-weather interior protection for Model Y.'],
    ['prd-access-003','Model 3 Roof Rack','accessories',667,'available',TESLA_ASSETS.accessories,'Tesla roof rack accessory for compatible Model 3 vehicles.'],
    ['prd-parts-001','Wall Connector Wirebox Kit','parts',65,'available',TESLA_ASSETS.accessories,'Replacement Wall Connector wirebox kit.'],
    ['prd-parts-002','Model 3/Y Air Filter','parts',20,'available',TESLA_ASSETS.accessories,'Replacement cabin air filter for compatible Tesla vehicles.'],
    ['prd-parts-003','Model 3 Wiper Blade','parts',25,'available',TESLA_ASSETS.accessories,'Replacement wiper blade for compatible Model 3 vehicles.'],
    ['prd-life-001','Tesla Desktop Supercharger','lifestyle',45,'available',TESLA_ASSETS.lifestyle,'Tesla lifestyle and desk collectible.'],
    ['prd-life-002','Tesla On the Road Tumbler','lifestyle',35,'available',TESLA_ASSETS.lifestyle,'Tesla travel and lifestyle item.'],
    ['prd-life-003','Tesla Vehicle Care Kit','lifestyle',60,'available',TESLA_ASSETS.lifestyle,'Tesla-oriented vehicle care goods.']
  ];
  for (const [id,name,category,price,status,image,description] of products) {
    await query(`INSERT INTO products (id,name,category,price,status,image_url,description,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,price=EXCLUDED.price,status=EXCLUDED.status,image_url=EXCLUDED.image_url,description=EXCLUDED.description,metadata=EXCLUDED.metadata,updated_at=NOW()`,
      [id,name,category,price,status,image,description,JSON.stringify({brand:'Tesla',source:'Tesla Shop reference'})]);
  }

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