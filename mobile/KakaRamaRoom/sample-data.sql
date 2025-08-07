-- Sample data untuk aplikasi Kakarama Room
-- Jalankan script ini di Supabase SQL Editor

-- 1. Insert sample apartments
INSERT INTO apartments (name, code, address, total_units, status, created_at, updated_at) VALUES
('Kakarama Tower A', 'KTA', 'Jl. Kakarama No. 1, Jakarta', 50, 'active', NOW(), NOW()),
('Kakarama Tower B', 'KTB', 'Jl. Kakarama No. 2, Jakarta', 40, 'active', NOW(), NOW()),
('Kakarama Residence', 'KR', 'Jl. Kakarama No. 3, Jakarta', 30, 'active', NOW(), NOW());

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
INSERT INTO admins (username, password, full_name, email, role, status, created_at, updated_at) VALUES
('admin', 'admin123', 'Administrator', 'admin@kakarama.com', 'super_admin', 'active', NOW(), NOW());

-- 7. Insert sample checkins (last 10 days)
INSERT INTO checkins (apartment_id, unit_id, team_id, marketing_name, payment_method, payment_amount, duration_hours, status, created_at, checkout_time, notes, updated_at)
SELECT 
  apartments.id as apartment_id,
  units.id as unit_id,
  field_teams.id as team_id,
  'Marketing ' || generate_series as marketing_name,
  CASE WHEN generate_series % 2 = 0 THEN 'cash' ELSE 'transfer' END as payment_method,
  150000 + (generate_series * 25000) as payment_amount,
  4 as duration_hours,
  CASE WHEN generate_series <= 5 THEN 'completed' ELSE 'active' END as status,
  NOW() - INTERVAL '1 day' * generate_series as created_at,
  NOW() - INTERVAL '1 day' * generate_series + INTERVAL '4 hours' as checkout_time,
  'Sample checkin ' || generate_series as notes,
  NOW() as updated_at
FROM generate_series(1, 10)
CROSS JOIN apartments
CROSS JOIN units
CROSS JOIN field_teams
WHERE apartments.id = (SELECT id FROM apartments ORDER BY id LIMIT 1 OFFSET (generate_series - 1) % 3)
  AND units.apartment_id = apartments.id
  AND field_teams.id = (SELECT id FROM field_teams ORDER BY id LIMIT 1 OFFSET (generate_series - 1) % 3)
LIMIT 10;

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
('admin', (SELECT id FROM admins WHERE username = 'admin'), 'login', 'Admin login to system', NOW() - INTERVAL '1 hour'),
('field_team', (SELECT id FROM field_teams WHERE username = 'team1'), 'checkin', 'Field team performed checkin', NOW() - INTERVAL '2 hours'),
('field_team', (SELECT id FROM field_teams WHERE username = 'team2'), 'checkout', 'Field team performed checkout', NOW() - INTERVAL '3 hours'),
('admin', (SELECT id FROM admins WHERE username = 'admin'), 'unit_update', 'Admin updated unit status', NOW() - INTERVAL '4 hours'),
('field_team', (SELECT id FROM field_teams WHERE username = 'team3'), 'checkin', 'Field team performed checkin', NOW() - INTERVAL '5 hours');

-- Display summary
SELECT 'Sample Data Summary' as info;
SELECT 'Apartments' as table_name, COUNT(*) as count FROM apartments;
SELECT 'Units' as table_name, COUNT(*) as count FROM units;
SELECT 'Field Teams' as table_name, COUNT(*) as count FROM field_teams;
SELECT 'Admins' as table_name, COUNT(*) as count FROM admins;
SELECT 'Checkins' as table_name, COUNT(*) as count FROM checkins;
SELECT 'Activity Logs' as table_name, COUNT(*) as count FROM activity_logs;
