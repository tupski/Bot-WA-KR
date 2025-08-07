-- =====================================================
-- KakaRama Room - Clean Migration Data
-- =====================================================
-- 
-- ✅ This file contains UUID-compatible INSERT statements
-- 🚀 Safe to run in Supabase SQL Editor
-- 
-- =====================================================

SELECT '📤 Starting data migration...' as status;

-- Sample apartments data
INSERT INTO apartments (name, code, whatsapp_group_id, address, status) VALUES 
('TreePark BSD', 'TREE-BSD', '120363297431494475-1234567890@g.us', 'BSD City, Tangerang Selatan', 'active'),
('Apartemen Central', 'APT-CENTRAL', '120363297431494475-1234567891@g.us', 'Jakarta Pusat', 'active'),
('Green Residence', 'GREEN-RES', '120363297431494475-1234567892@g.us', 'Bekasi', 'active');

-- Sample field teams
INSERT INTO field_teams (username, password, full_name, phone, status) VALUES 
('team_kr', 'team123', 'Tim KakaRama', '081234567890', 'active'),
('team_bsd', 'team123', 'Tim BSD', '081234567891', 'active'),
('team_central', 'team123', 'Tim Central', '081234567892', 'active');

-- Sample units (will be created after apartments exist)
DO $$
DECLARE
    apt_tree UUID;
    apt_central UUID;
    apt_green UUID;
BEGIN
    -- Get apartment IDs
    SELECT id INTO apt_tree FROM apartments WHERE code = 'TREE-BSD';
    SELECT id INTO apt_central FROM apartments WHERE code = 'APT-CENTRAL';
    SELECT id INTO apt_green FROM apartments WHERE code = 'GREEN-RES';
    
    -- Insert units for TreePark BSD
    INSERT INTO units (apartment_id, unit_number, unit_type, status) VALUES 
    (apt_tree, '1626', 'Studio', 'available'),
    (apt_tree, '1627', 'Studio', 'available'),
    (apt_tree, '1628', '1BR', 'available'),
    (apt_tree, '1629', '1BR', 'available'),
    (apt_tree, '1630', '2BR', 'available');
    
    -- Insert units for other apartments
    INSERT INTO units (apartment_id, unit_number, unit_type, status) VALUES 
    (apt_central, 'A101', 'Studio', 'available'),
    (apt_central, 'A102', '1BR', 'available'),
    (apt_central, 'A103', '2BR', 'available'),
    (apt_green, 'B201', 'Studio', 'available'),
    (apt_green, 'B202', '1BR', 'available');
END $$;

-- Sample team assignments
DO $$
DECLARE
    team_kr_id UUID;
    team_bsd_id UUID;
    team_central_id UUID;
    apt_tree UUID;
    apt_central UUID;
    apt_green UUID;
BEGIN
    -- Get team IDs
    SELECT id INTO team_kr_id FROM field_teams WHERE username = 'team_kr';
    SELECT id INTO team_bsd_id FROM field_teams WHERE username = 'team_bsd';
    SELECT id INTO team_central_id FROM field_teams WHERE username = 'team_central';
    
    -- Get apartment IDs
    SELECT id INTO apt_tree FROM apartments WHERE code = 'TREE-BSD';
    SELECT id INTO apt_central FROM apartments WHERE code = 'APT-CENTRAL';
    SELECT id INTO apt_green FROM apartments WHERE code = 'GREEN-RES';
    
    -- Assign teams to apartments
    INSERT INTO team_apartment_assignments (team_id, apartment_id) VALUES 
    (team_kr_id, apt_tree),
    (team_bsd_id, apt_tree),
    (team_central_id, apt_central),
    (team_kr_id, apt_green);
END $$;

-- Sample transactions (converted from bot data)
INSERT INTO transactions (message_id, location, unit, checkout_time, duration, payment_method, cs_name, commission, amount, net_amount, skip_financial, date_only) VALUES 
('msg_001', 'TREEPARK BSD', '1626', '21:25', '6 jam', 'Transfer', 'kr', 0, 250000, 250000, false, '2025-01-06'),
('msg_002', 'TREEPARK BSD', '1627', '14:30', '4 jam', 'Cash', 'kr', 15000, 200000, 185000, false, '2025-01-06'),
('msg_003', 'APT CENTRAL', 'A101', '16:00', '8 jam', 'Transfer', 'admin', 0, 300000, 300000, false, '2025-01-06');

-- Sample daily summary
INSERT INTO daily_summary (date, total_bookings, total_cash, total_transfer, total_gross, total_commission) VALUES 
('2025-01-06', 3, 200000, 550000, 750000, 15000),
('2025-01-05', 2, 150000, 300000, 450000, 10000),
('2025-01-04', 4, 400000, 600000, 1000000, 25000);

-- Sample CS summary
INSERT INTO cs_summary (date, cs_name, total_bookings, total_cash, total_transfer, total_commission) VALUES 
('2025-01-06', 'kr', 2, 200000, 250000, 15000),
('2025-01-06', 'admin', 1, 0, 300000, 0),
('2025-01-05', 'kr', 2, 150000, 300000, 10000);

-- Sample config
INSERT INTO config (key_name, value) VALUES 
('bot_version', '2.0'),
('auto_checkout_enabled', 'true'),
('default_commission_rate', '0.05'),
('whatsapp_webhook_url', 'https://your-webhook-url.com');

-- Sample processed messages
INSERT INTO processed_messages (message_id, chat_id, status) VALUES 
('msg_001', '120363297431494475-1234567890@g.us', 'processed'),
('msg_002', '120363297431494475-1234567890@g.us', 'processed'),
('msg_003', '120363297431494475-1234567891@g.us', 'processed');

SELECT '✅ Sample data migration completed!' as status;
SELECT 'Total apartments: ' || COUNT(*) as summary FROM apartments;
SELECT 'Total units: ' || COUNT(*) as summary FROM units;
SELECT 'Total teams: ' || COUNT(*) as summary FROM field_teams;
SELECT 'Total transactions: ' || COUNT(*) as summary FROM transactions;

SELECT '🎉 Database is ready with sample data!' as final_status;
