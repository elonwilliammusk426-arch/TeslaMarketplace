const { initializeDatabase } = require('../backend/src/init-db');
const { refreshVehicleAssets } = require('../backend/src/refresh-vehicle-assets');
const { query, closeDatabase, isDatabaseConfigured } = require('../backend/src/db');

const PRODUCT_SOURCES = {
  'prd-charge-001': 'https://shop.tesla.com/product/wall-connector',
  'prd-charge-002': 'https://shop.tesla.com/product/mobile-connector',
  'prd-charge-003': 'https://shop.tesla.com/product/universal-wall-connector',
  'prd-access-002': 'https://shop.tesla.com/product/model-y-all-weather-interior-liners',
  'prd-parts-001': 'https://shop.tesla.com/product/wall-connector-wirebox-kit'
};

async function harden() {
  if (!isDatabaseConfigured()) {
    if (process.env.NODE_ENV === 'production') throw new Error('DATABASE_URL is required in production');
    console.warn('Skipping database hardening because DATABASE_URL is not configured.');
    return;
  }

  await initializeDatabase();
  await refreshVehicleAssets();

  // Normalize marketplace data before adding constraints so existing databases can be upgraded safely.
  await query(`
    UPDATE products SET category=LOWER(TRIM(category)), updated_at=NOW();
    DELETE FROM products WHERE LOWER(TRIM(category))='apparel';
    UPDATE vehicles SET price=0 WHERE price < 0;
    UPDATE vehicles SET range_miles=0 WHERE range_miles < 0;
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_vehicles_status_model ON vehicles(status, model);
    CREATE INDEX IF NOT EXISTS idx_vehicles_updated_at ON vehicles(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_products_status_category ON products(status, category);
    CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
  `);

  await query(`ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_price_nonnegative`);
  await query(`ALTER TABLE vehicles ADD CONSTRAINT vehicles_price_nonnegative CHECK (price >= 0) NOT VALID`);
  await query(`ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_range_nonnegative`);
  await query(`ALTER TABLE vehicles ADD CONSTRAINT vehicles_range_nonnegative CHECK (range_miles >= 0) NOT VALID`);
  await query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_category_check`);
  await query(`ALTER TABLE products ADD CONSTRAINT products_category_check CHECK (category IN ('charging','accessories','parts','lifestyle')) NOT VALID`);
  await query(`ALTER TABLE products DROP CONSTRAINT IF EXISTS products_price_nonnegative`);
  await query(`ALTER TABLE products ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0) NOT VALID`);

  for (const [id, sourceUrl] of Object.entries(PRODUCT_SOURCES)) {
    await query(`
      UPDATE products
         SET metadata=jsonb_set(
           jsonb_set(COALESCE(metadata,'{}'::jsonb), '{sourceUrl}', to_jsonb($2::text)),
           '{catalogSource}', to_jsonb('Tesla Shop'::text)
         ),
         updated_at=NOW()
       WHERE id=$1
    `, [id, sourceUrl]);
  }

  const categories = await query(`
    SELECT category, COUNT(*)::int AS count
      FROM products
     WHERE status <> 'draft'
     GROUP BY category
     ORDER BY category
  `);
  const counts = Object.fromEntries(categories.rows.map(row => [row.category, row.count]));
  for (const category of ['charging', 'accessories', 'parts', 'lifestyle']) {
    if (!counts[category]) throw new Error(`Catalog integrity check failed: ${category} has no products`);
  }

  const vehicles = await query(`SELECT COUNT(*)::int AS count FROM vehicles WHERE status <> 'draft'`);
  if (!vehicles.rows[0]?.count) throw new Error('Catalog integrity check failed: no vehicles are available');

  console.log(`Production hardening complete: ${vehicles.rows[0].count} vehicles; ${Object.values(counts).reduce((a,b)=>a+b,0)} products across ${Object.keys(counts).length} categories.`);
}

harden()
  .catch(error => {
    console.error('Production hardening failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
