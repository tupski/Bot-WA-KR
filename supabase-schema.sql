-- KakaRama Room Database Schema for Supabase
-- Run this script in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Enable RLS for bot tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cs_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE config ENABLE ROW LEVEL SECURITY;

-- Create policies for bot tables
CREATE POLICY "Allow all operations for authenticated users" ON transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON cs_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON daily_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON processed_messages FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all operations for authenticated users" ON config FOR ALL USING (auth.role() = 'authenticated');

-- Add updated_at triggers for bot tables
CREATE TRIGGER update_config_updated_at BEFORE UPDATE ON config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
