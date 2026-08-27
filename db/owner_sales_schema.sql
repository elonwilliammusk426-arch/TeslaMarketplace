-- TeslaMarketplace owner-controlled sales architecture
-- Buyers purchase from the platform owner; there are no third-party sellers.

CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  stock_number TEXT UNIQUE,
  vin_last4 TEXT,
  acquisition_source TEXT,
  purchase_cost NUMERIC(12,2) CHECK (purchase_cost >= 0),
  sale_price NUMERIC(12,2) NOT NULL CHECK (sale_price >= 0),
  availability TEXT NOT NULL DEFAULT 'available'
    CHECK (availability IN ('available','reserved','sold','hidden')),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  listed_at TIMESTAMPTZ,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_requests (
  id TEXT PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customer_profiles(id) ON DELETE RESTRICT,
  inventory_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','approved','deposit_pending','reserved','completed','cancelled')),
  requested_price NUMERIC(12,2) CHECK (requested_price >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS update_monitor_events (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_type TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','rejected','applied')),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inventory_availability ON inventory(availability);
CREATE INDEX IF NOT EXISTS idx_inventory_published ON inventory(published);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_update_monitor_status ON update_monitor_events(status);
