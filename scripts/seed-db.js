const { query, closeDatabase, isDatabaseConfigured } = require('../src/db');

const vehicles = [
  ['TM-M3-2026', 'Model 3', 2026, 38990, 272, 'available', 'Long-range electric sedan with a minimalist premium interior.'],
  ['TM-MY-2026', 'Model Y', 2026, 44990, 320, 'available', 'Versatile electric SUV with flexible cargo space and long-range capability.'],
  ['TM-MS-2026', 'Model S', 2026, 79990, 410, 'available', 'Premium electric sedan focused on performance, range, and comfort.'],
  ['TM-MX-2026', 'Model X', 2026, 84990, 335, 'reserved', 'Premium electric SUV with three-row practicality and distinctive design.']
];

async function main() {
  if (!isDatabaseConfigured()) throw new Error('DATABASE_URL is required to seed PostgreSQL');
  for (const [id, model, year, price, rangeMiles, status, description] of vehicles) {
    await query(`
      INSERT INTO vehicles (id, model, year, price, range_miles, status, description)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (id) DO UPDATE SET
        model=EXCLUDED.model,
        year=EXCLUDED.year,
        price=EXCLUDED.price,
        range_miles=EXCLUDED.range_miles,
        status=EXCLUDED.status,
        description=EXCLUDED.description
    `, [id, model, year, price, rangeMiles, status, description]);
  }
  console.log(`Seeded ${vehicles.length} marketplace vehicles.`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(closeDatabase);
