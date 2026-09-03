CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(320) NOT NULL UNIQUE,
  phone VARCHAR(40),
  role VARCHAR(40) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id VARCHAR(64) PRIMARY KEY,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  range_miles INTEGER NOT NULL DEFAULT 0 CHECK (range_miles >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold','draft')),
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicle_options (
  id VARCHAR(64) PRIMARY KEY,
  vehicle_model VARCHAR(100) NOT NULL,
  category VARCHAR(40) NOT NULL CHECK (category IN ('paint','wheels','interior','software','trim')),
  option_name VARCHAR(160) NOT NULL,
  additional_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (additional_price >= 0),
  image_url TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configurations (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id VARCHAR(64) REFERENCES vehicles(id) ON DELETE SET NULL,
  model VARCHAR(100) NOT NULL,
  base_price NUMERIC(12,2) NOT NULL CHECK (base_price >= 0),
  options_total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (options_total >= 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  finance_monthly NUMERIC(12,2),
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 250 CHECK (deposit_amount >= 0),
  snapshot JSONB NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','checkout','ordered','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS configuration_options (
  configuration_id VARCHAR(64) NOT NULL REFERENCES configurations(id) ON DELETE CASCADE,
  option_id VARCHAR(64) NOT NULL REFERENCES vehicle_options(id),
  option_name VARCHAR(160) NOT NULL,
  category VARCHAR(40) NOT NULL,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (configuration_id, option_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  tracking_id VARCHAR(80) NOT NULL UNIQUE,
  vehicle_id VARCHAR(64) REFERENCES vehicles(id),
  user_id VARCHAR(64) REFERENCES users(id),
  configuration_id VARCHAR(64) REFERENCES configurations(id) ON DELETE SET NULL,
  customer_name VARCHAR(160) NOT NULL,
  customer_email VARCHAR(320) NOT NULL,
  customer_phone VARCHAR(40),
  total NUMERIC(12,2) NOT NULL CHECK (total >= 0),
  deposit_amount NUMERIC(12,2) NOT NULL DEFAULT 250 CHECK (deposit_amount >= 0),
  status VARCHAR(40) NOT NULL DEFAULT 'received',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL DEFAULT 'stripe',
  provider_payment_id VARCHAR(255) UNIQUE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_schedules (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  delivery_date DATE,
  delivery_window VARCHAR(80),
  address_line1 VARCHAR(240),
  city VARCHAR(120),
  state VARCHAR(80),
  postal_code VARCHAR(20),
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
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

CREATE TABLE IF NOT EXISTS consignments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  carrier VARCHAR(120), tracking_number VARCHAR(120), status VARCHAR(60) NOT NULL DEFAULT 'pending',
  origin VARCHAR(200), destination VARCHAR(200), estimated_delivery DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS requests (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(80) NOT NULL DEFAULT 'general', name VARCHAR(160) NOT NULL,
  email VARCHAR(320) NOT NULL, message TEXT NOT NULL DEFAULT '', status VARCHAR(40) NOT NULL DEFAULT 'received',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_options_model_category ON vehicle_options(vehicle_model, category, active);
CREATE INDEX IF NOT EXISTS idx_configurations_user_id ON configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_id ON orders(tracking_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_tracking_events_order_id ON tracking_events(order_id, created_at);
