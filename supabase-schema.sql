-- =====================================================
-- KakaRama Room Database Schema for Supabase
-- =====================================================
--
-- ⚠️  WARNING: This script will DROP ALL EXISTING TABLES!
-- 🗑️  All data will be PERMANENTLY DELETED!
-- 💾  Make sure you have backed up your data before running this script!
--
-- Run this script in Supabase SQL Editor
--
-- What this script does:
-- 1. Drops all existing tables, views, functions, types
-- 2. Cleans up all policies and triggers
-- 3. Creates fresh schema with all tables
-- 4. Sets up indexes, triggers, and RLS policies
-- 5. Inserts default admin user
--
-- Created: 2025-01-06
-- Version: 2.0 (Complete Reset)
-- =====================================================

-- =====================================================
-- DROP EXISTING TABLES AND OBJECTS (if they exist)
-- =====================================================

-- Show current timestamp
SELECT 'Starting database reset at: ' || NOW() as status;

-- Count existing tables before dropping
SELECT 'Tables to be dropped: ' || COUNT(*) as status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Show warning message
SELECT '⚠️  WARNING: Dropping all existing tables in 3 seconds...' as status;
SELECT pg_sleep(1);
SELECT '⚠️  WARNING: Dropping all existing tables in 2 seconds...' as status;
SELECT pg_sleep(1);
SELECT '⚠️  WARNING: Dropping all existing tables in 1 second...' as status;
SELECT pg_sleep(1);
SELECT '🗑️  Starting table cleanup...' as status;

-- Drop views first (they depend on tables)
DROP VIEW IF EXISTS checkins_with_details CASCADE;
DROP VIEW IF EXISTS units_with_apartment CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_active_checkins() CASCADE;
DROP FUNCTION IF EXISTS process_auto_checkout() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS checkin_extensions CASCADE;
DROP TABLE IF EXISTS checkins CASCADE;
DROP TABLE IF EXISTS team_apartment_assignments CASCADE;
DROP TABLE IF EXISTS units CASCADE;
DROP TABLE IF EXISTS field_teams CASCADE;
DROP TABLE IF EXISTS apartments CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Drop bot-specific tables
DROP TABLE IF EXISTS config CASCADE;
DROP TABLE IF EXISTS processed_messages CASCADE;
DROP TABLE IF EXISTS daily_summary CASCADE;
DROP TABLE IF EXISTS cs_summary CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;

-- Drop custom types
DROP TYPE IF EXISTS activity_action CASCADE;
DROP TYPE IF EXISTS checkin_status CASCADE;
DROP TYPE IF EXISTS unit_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Drop any remaining policies (cleanup)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on public schema tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename || ' CASCADE';
    END LOOP;
END $$;

-- Drop any remaining triggers
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all triggers on public schema tables
    FOR r IN (SELECT schemaname, tablename, triggername FROM information_schema.triggers WHERE trigger_schema = 'public')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.triggername || ' ON ' || r.schemaname || '.' || r.tablename || ' CASCADE';
    END LOOP;
END $$;

-- Cleanup completed
SELECT '✅ Database cleanup completed!' as status;
SELECT 'Remaining tables: ' || COUNT(*) as status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- =====================================================
-- CREATE NEW SCHEMA
-- =====================================================

SELECT '🚀 Creating new database schema...' as status;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SELECT '📝 Creating custom types...' as status;

-- Create custom types
CREATE TYPE user_role AS ENUM ('admin', 'field_team');
CREATE TYPE unit_status AS ENUM ('available', 'occupied', 'cleaning', 'maintenance');
CREATE TYPE checkin_status AS ENUM ('active', 'extended', 'completed', 'early_checkout');
CREATE TYPE activity_action AS ENUM (
  'login', 'logout', 'create_checkin', 'extend_checkin', 'early_checkout', 
  'auto_checkout', 'create_apartment', 'update_apartment', 'delete_apartment',
  'create_team', 'update_team', 'delete_team', 'create_unit', 'update_unit', 
  'delete_unit', 'update_unit_status'
);

SELECT '🏗️  Creating main application tables...' as status;

-- Admins table
CREATE TABLE admins (
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
CREATE TABLE apartments (
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
CREATE TABLE field_teams (
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
CREATE TABLE units (
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
CREATE TABLE team_apartment_assignments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  team_id UUID REFERENCES field_teams(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES apartments(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, apartment_id)
);

-- Checkins table
CREATE TABLE checkins (
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
CREATE TABLE checkin_extensions (
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
CREATE TABLE activity_logs (
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

-- Create indexes for better performance
CREATE INDEX idx_units_apartment_id ON units(apartment_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_checkins_apartment_id ON checkins(apartment_id);
CREATE INDEX idx_checkins_unit_id ON checkins(unit_id);
CREATE INDEX idx_checkins_team_id ON checkins(team_id);
CREATE INDEX idx_checkins_status ON checkins(status);
CREATE INDEX idx_checkins_checkout_time ON checkins(checkout_time);
CREATE INDEX idx_checkins_created_at ON checkins(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON apartments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_field_teams_updated_at BEFORE UPDATE ON field_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password: admin123)
INSERT INTO admins (username, password, full_name, email) VALUES
('admin', 'admin123', 'Administrator', 'admin@kakarama.com');

-- Row Level Security (RLS) Policies
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_apartment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now, customize later based on requirements)
CREATE POLICY "Allow all operations for authenticated users" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON apartments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON field_teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON units FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON team_apartment_assignments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON checkins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON checkin_extensions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');

-- Create views for easier data access
CREATE VIEW checkins_with_details AS
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

CREATE VIEW units_with_apartment AS
SELECT 
  u.*,
  a.name as apartment_name,
  a.code as apartment_code
FROM units u
JOIN apartments a ON u.apartment_id = a.id;

-- Create functions for common operations
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

-- Create function for auto-checkout
CREATE OR REPLACE FUNCTION process_auto_checkout()
RETURNS TABLE (
  checkin_id UUID,
  unit_number VARCHAR,
  apartment_name VARCHAR
) AS $$
BEGIN
  -- Update expired checkins to completed
  UPDATE checkins
  SET status = 'completed', updated_at = NOW()
  WHERE status IN ('active', 'extended')
    AND checkout_time <= NOW();

  -- Update unit status to cleaning
  UPDATE units
  SET status = 'cleaning', cleaning_started_at = NOW(), updated_at = NOW()
  WHERE id IN (
    SELECT unit_id FROM checkins
    WHERE status = 'completed'
      AND updated_at >= NOW() - INTERVAL '1 minute'
  );

  -- Return processed checkins
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

SELECT '🤖 Creating WhatsApp Bot compatibility tables...' as status;

-- Additional tables for WhatsApp Bot compatibility
-- Transactions table (from existing bot data)
CREATE TABLE transactions (
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

-- CS Summary table
CREATE TABLE cs_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE,
  cs_name VARCHAR(50),
  total_bookings INTEGER DEFAULT 0,
  total_cash DECIMAL(12,2) DEFAULT 0,
  total_transfer DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Summary table
CREATE TABLE daily_summary (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE UNIQUE,
  total_bookings INTEGER DEFAULT 0,
  total_cash DECIMAL(12,2) DEFAULT 0,
  total_transfer DECIMAL(12,2) DEFAULT 0,
  total_gross DECIMAL(12,2) DEFAULT 0,
  total_commission DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Processed Messages table (untuk tracking pesan WhatsApp)
CREATE TABLE processed_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id VARCHAR(255) UNIQUE,
  chat_id VARCHAR(255),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'processed'
);

-- Config table (untuk konfigurasi bot)
CREATE TABLE config (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

SELECT '📊 Creating indexes for better performance...' as status;

-- Create indexes for main tables
CREATE INDEX idx_units_apartment_id ON units(apartment_id);
CREATE INDEX idx_units_status ON units(status);
CREATE INDEX idx_checkins_apartment_id ON checkins(apartment_id);
CREATE INDEX idx_checkins_unit_id ON checkins(unit_id);
CREATE INDEX idx_checkins_team_id ON checkins(team_id);
CREATE INDEX idx_checkins_status ON checkins(status);
CREATE INDEX idx_checkins_checkout_time ON checkins(checkout_time);
CREATE INDEX idx_checkins_created_at ON checkins(created_at);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Create indexes for bot tables
CREATE INDEX idx_transactions_location ON transactions(location);
CREATE INDEX idx_transactions_date_only ON transactions(date_only);
CREATE INDEX idx_transactions_cs_name ON transactions(cs_name);
CREATE INDEX idx_cs_summary_date ON cs_summary(date);
CREATE INDEX idx_cs_summary_cs_name ON cs_summary(cs_name);
CREATE INDEX idx_daily_summary_date ON daily_summary(date);
CREATE INDEX idx_processed_messages_message_id ON processed_messages(message_id);
CREATE INDEX idx_processed_messages_chat_id ON processed_messages(chat_id);
CREATE INDEX idx_config_key_name ON config(key_name);

SELECT '🔒 Setting up Row Level Security (RLS)...' as status;

-- Enable RLS for main tables
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_apartment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_extensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS for bot tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

SELECT '🛡️  Creating RLS policies...' as status;

-- Create policies for main tables (allow all for now, customize later based on requirements)
CREATE POLICY "Allow all operations for authenticated users" ON admins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON apartments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON field_teams FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON units FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON team_apartment_assignments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON checkins FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON checkin_extensions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');

-- Create policies for bot tables
CREATE POLICY "Allow all operations for authenticated users" ON transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON cs_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON daily_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON processed_messages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON config FOR ALL USING (auth.role() = 'authenticated');

SELECT '⚡ Creating triggers and functions...' as status;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers for main tables
CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apartments_updated_at BEFORE UPDATE ON apartments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_field_teams_updated_at BEFORE UPDATE ON field_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_units_updated_at BEFORE UPDATE ON units FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_checkins_updated_at BEFORE UPDATE ON checkins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add updated_at triggers for bot tables
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

SELECT '👁️  Creating views for easier data access...' as status;

-- Create views for easier data access
CREATE VIEW checkins_with_details AS
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

CREATE VIEW units_with_apartment AS
SELECT
  u.*,
  a.name as apartment_name,
  a.code as apartment_code
FROM units u
JOIN apartments a ON u.apartment_id = a.id;

SELECT '🔧 Creating utility functions...' as status;

-- Create functions for common operations
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

-- Create function for auto-checkout
CREATE OR REPLACE FUNCTION process_auto_checkout()
RETURNS TABLE (
  checkin_id UUID,
  unit_number VARCHAR,
  apartment_name VARCHAR
) AS $$
BEGIN
  -- Update expired checkins to completed
  UPDATE checkins
  SET status = 'completed', updated_at = NOW()
  WHERE status IN ('active', 'extended')
    AND checkout_time <= NOW();

  -- Update unit status to cleaning
  UPDATE units
  SET status = 'cleaning', cleaning_started_at = NOW(), updated_at = NOW()
  WHERE id IN (
    SELECT unit_id FROM checkins
    WHERE status = 'completed'
      AND updated_at >= NOW() - INTERVAL '1 minute'
  );

  -- Return processed checkins
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

SELECT '👤 Inserting default admin user...' as status;

-- Insert default admin user (password: admin123)
INSERT INTO admins (username, password, full_name, email) VALUES
('admin', 'admin123', 'Administrator', 'admin@kakarama.com');

-- =====================================================
-- COMPLETION STATUS
-- =====================================================

SELECT '🎉 Database schema creation completed successfully!' as status;
SELECT 'Created at: ' || NOW() as timestamp;

-- Show final table count
SELECT 'Total tables created: ' || COUNT(*) as final_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- Show created tables
SELECT '📋 Created tables:' as status;
SELECT table_name as created_tables
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT '✅ KakaRama Room database is ready to use!' as status;
SELECT '🚀 You can now run the migration script to import existing data.' as next_step;
