-- =====================================================
-- KakaRama Room - Simple Database Schema (Safe Version)
-- =====================================================
-- 
-- ✅ This is a SAFER version without aggressive DROP commands
-- 🔧 Use this if you want to create schema without destroying existing data
-- 
-- =====================================================

SELECT '🚀 Starting KakaRama Room database setup...' as status;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'field_team');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE unit_status AS ENUM ('available', 'occupied', 'cleaning', 'maintenance');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE checkin_status AS ENUM ('active', 'extended', 'completed', 'early_checkout');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_action AS ENUM (
      'login', 'logout', 'create_checkin', 'extend_checkin', 'early_checkout', 
      'auto_checkout', 'create_apartment', 'update_apartment', 'delete_apartment',
      'create_team', 'update_team', 'delete_team', 'create_unit', 'update_unit', 
      'delete_unit', 'update_unit_status'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

SELECT '🏗️  Creating tables...' as status;

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Apartments table
CREATE TABLE IF NOT EXISTS apartments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,
  whatsapp_group_id VARCHAR(255),
  address TEXT,
  description TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Field teams table
CREATE TABLE IF NOT EXISTS field_teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Units table
CREATE TABLE IF NOT EXISTS units (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  unit_number VARCHAR(20) NOT NULL,
  unit_type VARCHAR(50),
  status unit_status DEFAULT 'available',
  cleaning_started_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(apartment_id, unit_number)
);

-- Team apartment assignments table
CREATE TABLE IF NOT EXISTS team_apartment_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES field_teams(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, apartment_id)
);

-- Checkins table
CREATE TABLE IF NOT EXISTS checkins (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  team_id UUID REFERENCES field_teams(id) ON DELETE SET NULL,
  duration_hours INTEGER NOT NULL,
  checkout_time TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method VARCHAR(50),
  payment_amount DECIMAL(12,2),
  payment_proof_path TEXT,
  marketing_name VARCHAR(100),
  notes TEXT,
  status checkin_status DEFAULT 'active',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Checkin extensions table
CREATE TABLE IF NOT EXISTS checkin_extensions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  checkin_id UUID REFERENCES checkins(id) ON DELETE CASCADE,
  additional_hours INTEGER NOT NULL,
  new_checkout_time TIMESTAMP WITH TIME ZONE NOT NULL,
  payment_method VARCHAR(50),
  payment_amount DECIMAL(12,2),
  payment_proof_path TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  user_type user_role NOT NULL,
  action activity_action NOT NULL,
  description TEXT NOT NULL,
  target_table VARCHAR(50),
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT '🤖 Creating bot tables...' as status;

-- Bot compatibility tables
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id VARCHAR(255),
  location VARCHAR(100),
  unit VARCHAR(50),
  checkout_time VARCHAR(100),
  duration VARCHAR(50),
  payment_method VARCHAR(20),
  cs_name VARCHAR(50),
  commission DECIMAL(10,2),
  amount DECIMAL(12,2),
  net_amount DECIMAL(12,2),
  skip_financial BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  date_only DATE
);

CREATE TABLE IF NOT EXISTS cs_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE,
  cs_name VARCHAR(50),
  total_bookings INTEGER DEFAULT 0,
  total_cash DECIMAL(12,2) DEFAULT 0,
  total_transfer DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  total_cash DECIMAL(12,2) DEFAULT 0,
  total_transfer DECIMAL(12,2) DEFAULT 0,
  total_gross DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  chat_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'processed'
);

CREATE TABLE IF NOT EXISTS config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT '📊 Creating indexes...' as status;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_units_apartment_id ON units(apartment_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON units(status);
CREATE INDEX IF NOT EXISTS idx_checkins_apartment_id ON checkins(apartment_id);
CREATE INDEX IF NOT EXISTS idx_checkins_unit_id ON checkins(unit_id);
CREATE INDEX IF NOT EXISTS idx_checkins_team_id ON checkins(team_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_checkout_time ON checkins(checkout_time);
CREATE INDEX IF NOT EXISTS idx_checkins_created_at ON checkins(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_location ON transactions(location);
CREATE INDEX IF NOT EXISTS idx_transactions_date_only ON transactions(date_only);
CREATE INDEX IF NOT EXISTS idx_transactions_cs_name ON transactions(cs_name);
CREATE INDEX IF NOT EXISTS idx_cs_summary_date ON cs_summary(date);
CREATE INDEX IF NOT EXISTS idx_cs_summary_cs_name ON cs_summary(cs_name);
CREATE INDEX IF NOT EXISTS idx_daily_summary_date ON daily_summary(date);
CREATE INDEX IF NOT EXISTS idx_processed_messages_message_id ON processed_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_processed_messages_chat_id ON processed_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_config_key_name ON config(key_name);

SELECT '🔧 Creating functions...' as status;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers
DO $$ BEGIN
    CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON apartments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_field_teams_updated_at BEFORE UPDATE ON field_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

SELECT '👁️  Creating views...' as status;

-- Create views
CREATE OR REPLACE VIEW checkins_with_details AS
SELECT 
  c.*,
  u.unit_number,
  u.unit_type,
  a.name as apartment_name,
  a.code as apartment_code,
  ft.full_name as team_name,
  ft.phone as team_phone
FROM checkins c
JOIN units u ON c.unit_id = u.id
JOIN apartments a ON c.apartment_id = a.id
LEFT JOIN field_teams ft ON c.team_id = ft.id;

CREATE OR REPLACE VIEW units_with_apartment AS
SELECT 
  u.*,
  a.name as apartment_name,
  a.code as apartment_code
FROM units u
JOIN apartments a ON u.apartment_id = a.id;

-- Create utility functions
CREATE OR REPLACE FUNCTION get_active_checkins()
RETURNS TABLE (
  id UUID,
  unit_number VARCHAR,
  apartment_name VARCHAR,
  team_name VARCHAR,
  checkout_time TIMESTAMP WITH TIME ZONE,
  status checkin_status
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    u.unit_number,
    a.name,
    ft.full_name,
    c.checkout_time,
    c.status
  FROM checkins c
  JOIN units u ON c.unit_id = u.id
  JOIN apartments a ON c.apartment_id = a.id
  LEFT JOIN field_teams ft ON c.team_id = ft.id
  WHERE c.status IN ('active', 'extended');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION process_auto_checkout()
RETURNS TABLE (
  checkin_id UUID,
  unit_number VARCHAR,
  apartment_name VARCHAR
) AS $$
BEGIN
  UPDATE checkins 
  SET status = 'completed', updated_at = NOW()
  WHERE status IN ('active', 'extended') 
    AND checkout_time <= NOW();
  
  UPDATE units 
  SET status = 'cleaning', cleaning_started_at = NOW(), updated_at = NOW()
  WHERE id IN (
    SELECT unit_id FROM checkins 
    WHERE status = 'completed' 
      AND updated_at >= NOW() - INTERVAL '1 minute'
  );
  
  RETURN QUERY
  SELECT 
    c.id,
    u.unit_number,
    a.name
  FROM checkins c
  JOIN units u ON c.unit_id = u.id
  JOIN apartments a ON c.apartment_id = a.id
  WHERE c.status = 'completed' 
    AND c.updated_at >= NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql;

SELECT '👤 Creating default admin...' as status;

-- Insert default admin user (only if not exists)
INSERT INTO admins (username, password, full_name, email) 
SELECT 'admin', 'admin123', 'Administrator', 'admin@kakarama.com'
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');

SELECT '✅ Schema setup completed successfully!' as status;
SELECT 'Total tables: ' || COUNT(*) as summary
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT '🎉 KakaRama Room database is ready!' as final_status;
