-- Sample data untuk aplikasi Kakarama Room
-- Jalankan script ini di Supabase SQL Editor

-- 1. Insert sample apartments
INSERT INTO apartments (name, code, address, description, status, created_at, updated_at) VALUES
('Kakarama Tower A', 'KTA', 'Jl. Kakarama No. 1, Jakarta', 'Tower A dengan 50 unit premium', 'active', NOW(), NOW()),
('Kakarama Tower B', 'KTB', 'Jl. Kakarama No. 2, Jakarta', 'Tower B dengan 40 unit modern', 'active', NOW(), NOW()),
('Kakarama Residence', 'KR', 'Jl. Kakarama No. 3, Jakarta', 'Residence dengan 30 unit eksklusif', 'active', NOW(), NOW());

-- 2. Insert sample units for Tower A (50 units)
INSERT INTO units (apartment_id, unit_number, unit_type, status, created_at, updated_at)
SELECT 
  (SELECT id FROM apartments WHERE code = 'KTA'),
  'KTA-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 20 THEN 'standard'
    WHEN generate_series <= 35 THEN 'deluxe'
    ELSE 'suite'
  END,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 50);

-- 3. Insert sample units for Tower B (40 units)
INSERT INTO units (apartment_id, unit_number, unit_type, status, created_at, updated_at)
SELECT 
  (SELECT id FROM apartments WHERE code = 'KTB'),
  'KTB-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 15 THEN 'standard'
    WHEN generate_series <= 30 THEN 'deluxe'
    ELSE 'suite'
  END,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 40);

-- 4. Insert sample units for Residence (30 units)
INSERT INTO units (apartment_id, unit_number, unit_type, status, created_at, updated_at)
SELECT 
  (SELECT id FROM apartments WHERE code = 'KR'),
  'KR-' || LPAD(generate_series::text, 3, '0'),
  CASE 
    WHEN generate_series <= 10 THEN 'standard'
    WHEN generate_series <= 20 THEN 'deluxe'
    ELSE 'suite'
  END,
  'available',
  NOW(),
  NOW()
FROM generate_series(1, 30);

-- 5. Insert sample field teams
INSERT INTO field_teams (username, password, full_name, phone, email, status, created_at, updated_at) VALUES
('team1', 'team123', 'Tim Lapangan 1', '081234567890', 'team1@kakarama.com', 'active', NOW(), NOW()),
('team2', 'team123', 'Tim Lapangan 2', '081234567891', 'team2@kakarama.com', 'active', NOW(), NOW()),
('team3', 'team123', 'Tim Lapangan 3', '081234567892', 'team3@kakarama.com', 'active', NOW(), NOW());

-- 6. Insert sample admin
INSERT INTO admins (username, password, full_name, email, phone, created_at, updated_at) VALUES
('admin', 'admin123', 'Administrator', 'admin@kakarama.com', '081234567899', NOW(), NOW());

-- 7. Insert sample checkins (simplified)
-- Get first apartment, unit, and team IDs for sample data
DO $$
DECLARE
    apt_id UUID;
    unit_id UUID;
    team_id UUID;
BEGIN
    -- Get sample IDs
    SELECT id INTO apt_id FROM apartments WHERE code = 'KTA' LIMIT 1;
    SELECT id INTO unit_id FROM units WHERE apartment_id = apt_id LIMIT 1;
    SELECT id INTO team_id FROM field_teams WHERE username = 'team1' LIMIT 1;

    -- Insert sample checkins
    INSERT INTO checkins (apartment_id, unit_id, team_id, marketing_name, payment_method, payment_amount, duration_hours, status, created_at, checkout_time, notes, updated_at) VALUES
    (apt_id, unit_id, team_id, 'Marketing 1', 'cash', 150000, 4, 'completed', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '4 hours', 'Sample checkin 1', NOW()),
    (apt_id, unit_id, team_id, 'Marketing 2', 'transfer', 175000, 4, 'completed', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '4 hours', 'Sample checkin 2', NOW()),
    (apt_id, unit_id, team_id, 'Marketing 3', 'cash', 200000, 4, 'active', NOW() - INTERVAL '3 hours', NOW() + INTERVAL '1 hour', 'Sample checkin 3', NOW());
END $$;

-- 8. Update some units to different statuses for variety
UPDATE units SET status = 'occupied' WHERE id IN (
  SELECT id FROM units ORDER BY RANDOM() LIMIT 5
);

UPDATE units SET status = 'cleaning' WHERE id IN (
  SELECT id FROM units WHERE status = 'available' ORDER BY RANDOM() LIMIT 3
);

UPDATE units SET status = 'maintenance' WHERE id IN (
  SELECT id FROM units WHERE status = 'available' ORDER BY RANDOM() LIMIT 2
);

-- 9. Insert some activity logs
INSERT INTO activity_logs (user_type, user_id, action, description, created_at) VALUES
('admin'::user_role, (SELECT id FROM admins WHERE username = 'admin'), 'login'::activity_action, 'Admin login to system', NOW() - INTERVAL '1 hour'),
('field_team'::user_role, (SELECT id FROM field_teams WHERE username = 'team1'), 'create_checkin'::activity_action, 'Field team performed checkin', NOW() - INTERVAL '2 hours'),
('field_team'::user_role, (SELECT id FROM field_teams WHERE username = 'team2'), 'auto_checkout'::activity_action, 'Field team performed checkout', NOW() - INTERVAL '3 hours'),
('admin'::user_role, (SELECT id FROM admins WHERE username = 'admin'), 'update_unit_status'::activity_action, 'Admin updated unit status', NOW() - INTERVAL '4 hours'),
('field_team'::user_role, (SELECT id FROM field_teams WHERE username = 'team3'), 'create_checkin'::activity_action, 'Field team performed checkin', NOW() - INTERVAL '5 hours');

-- Display summary
SELECT 'Sample Data Summary' as info;
SELECT 'Apartments' as table_name, COUNT(*) as count FROM apartments;
SELECT 'Units' as table_name, COUNT(*) as count FROM units;
SELECT 'Field Teams' as table_name, COUNT(*) as count FROM field_teams;
SELECT 'Admins' as table_name, COUNT(*) as count FROM admins;
SELECT 'Checkins' as table_name, COUNT(*) as count FROM checkins;
SELECT 'Activity Logs' as table_name, COUNT(*) as count FROM activity_logs;
