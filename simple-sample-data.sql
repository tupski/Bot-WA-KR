-- Simple sample data untuk testing aplikasi Kakarama Room
-- Jalankan script ini di Supabase SQL Editor

-- 1. Insert sample apartments
INSERT INTO apartments (name, code, address, description) VALUES
('Kakarama Tower A', 'KTA', 'Jl. Kakarama No. 1, Jakarta', 'Tower A dengan fasilitas premium'),
('Kakarama Tower B', 'KTB', 'Jl. Kakarama No. 2, Jakarta', 'Tower B dengan fasilitas modern'),
('Kakarama Residence', 'KR', 'Jl. Kakarama No. 3, Jakarta', 'Residence dengan suasana eksklusif');

-- 2. Insert sample units (10 units per apartment)
INSERT INTO units (apartment_id, unit_number, unit_type, status) VALUES
-- Tower A units
((SELECT id FROM apartments WHERE code = 'KTA'), 'KTA-001', 'standard', 'available'),
((SELECT id FROM apartments WHERE code = 'KTA'), 'KTA-002', 'standard', 'available'),
((SELECT id FROM apartments WHERE code = 'KTA'), 'KTA-003', 'deluxe', 'available'),
((SELECT id FROM apartments WHERE code = 'KTA'), 'KTA-004', 'deluxe', 'occupied'),
((SELECT id FROM apartments WHERE code = 'KTA'), 'KTA-005', 'suite', 'cleaning'),
-- Tower B units
((SELECT id FROM apartments WHERE code = 'KTB'), 'KTB-001', 'standard', 'available'),
((SELECT id FROM apartments WHERE code = 'KTB'), 'KTB-002', 'standard', 'available'),
((SELECT id FROM apartments WHERE code = 'KTB'), 'KTB-003', 'deluxe', 'available'),
((SELECT id FROM apartments WHERE code = 'KTB'), 'KTB-004', 'deluxe', 'occupied'),
((SELECT id FROM apartments WHERE code = 'KTB'), 'KTB-005', 'suite', 'maintenance'),
-- Residence units
((SELECT id FROM apartments WHERE code = 'KR'), 'KR-001', 'standard', 'available'),
((SELECT id FROM apartments WHERE code = 'KR'), 'KR-002', 'standard', 'available'),
((SELECT id FROM apartments WHERE code = 'KR'), 'KR-003', 'deluxe', 'available'),
((SELECT id FROM apartments WHERE code = 'KR'), 'KR-004', 'deluxe', 'available'),
((SELECT id FROM apartments WHERE code = 'KR'), 'KR-005', 'suite', 'available');

-- 3. Insert sample field teams
INSERT INTO field_teams (username, password, full_name, phone, email) VALUES
('team1', 'team123', 'Tim Lapangan 1', '081234567890', 'team1@kakarama.com'),
('team2', 'team123', 'Tim Lapangan 2', '081234567891', 'team2@kakarama.com'),
('team3', 'team123', 'Tim Lapangan 3', '081234567892', 'team3@kakarama.com');

-- 4. Insert sample admin
INSERT INTO admins (username, password, full_name, email, phone) VALUES
('admin', 'admin123', 'Administrator', 'admin@kakarama.com', '081234567899');

-- 5. Insert sample checkins
INSERT INTO checkins (apartment_id, unit_id, team_id, marketing_name, payment_method, payment_amount, duration_hours, status, created_at, checkout_time, notes) VALUES
(
  (SELECT id FROM apartments WHERE code = 'KTA'),
  (SELECT id FROM units WHERE unit_number = 'KTA-001'),
  (SELECT id FROM field_teams WHERE username = 'team1'),
  'Marketing A',
  'cash',
  150000,
  4,
  'completed',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day' + INTERVAL '4 hours',
  'Sample checkin completed'
),
(
  (SELECT id FROM apartments WHERE code = 'KTB'),
  (SELECT id FROM units WHERE unit_number = 'KTB-001'),
  (SELECT id FROM field_teams WHERE username = 'team2'),
  'Marketing B',
  'transfer',
  175000,
  4,
  'active',
  NOW() - INTERVAL '2 hours',
  NOW() + INTERVAL '2 hours',
  'Sample checkin active'
),
(
  (SELECT id FROM apartments WHERE code = 'KR'),
  (SELECT id FROM units WHERE unit_number = 'KR-001'),
  (SELECT id FROM field_teams WHERE username = 'team3'),
  'Marketing C',
  'cash',
  200000,
  6,
  'extended',
  NOW() - INTERVAL '3 hours',
  NOW() + INTERVAL '3 hours',
  'Sample checkin extended'
);

-- 6. Display summary
SELECT 'Sample Data Summary' as info;
SELECT 'Apartments' as table_name, COUNT(*) as count FROM apartments;
SELECT 'Units' as table_name, COUNT(*) as count FROM units;
SELECT 'Field Teams' as table_name, COUNT(*) as count FROM field_teams;
SELECT 'Admins' as table_name, COUNT(*) as count FROM admins;
SELECT 'Checkins' as table_name, COUNT(*) as count FROM checkins;

-- 7. Show sample data
SELECT 'Apartments:' as info;
SELECT name, code, address FROM apartments;

SELECT 'Units by status:' as info;
SELECT status, COUNT(*) as count FROM units GROUP BY status;

SELECT 'Active checkins:' as info;
SELECT 
  a.name as apartment,
  u.unit_number,
  ft.full_name as team,
  c.marketing_name,
  c.status,
  c.checkout_time
FROM checkins c
JOIN apartments a ON c.apartment_id = a.id
JOIN units u ON c.unit_id = u.id
JOIN field_teams ft ON c.team_id = ft.id
WHERE c.status IN ('active', 'extended')
ORDER BY c.created_at DESC;
