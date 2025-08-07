#!/usr/bin/env python3
"""
Script untuk memperbaiki migration-data.sql
Mengkonversi integer ID menjadi UUID-compatible
"""

import re
import uuid

def generate_uuid():
    """Generate UUID v4"""
    return str(uuid.uuid4())

def fix_migration_sql():
    """Fix migration SQL file untuk kompatibilitas dengan Supabase UUID"""
    
    print("🔧 Fixing migration-data.sql for UUID compatibility...")
    
    # Read original file
    try:
        with open('migration-data.sql', 'r', encoding='utf-8') as f:
            content = f.read()
    except FileNotFoundError:
        print("❌ migration-data.sql not found!")
        return
    
    # Backup original file
    with open('migration-data.sql.backup', 'w', encoding='utf-8') as f:
        f.write(content)
    print("💾 Backup created: migration-data.sql.backup")
    
    # Fix each INSERT statement
    lines = content.split('\n')
    fixed_lines = []
    
    for line in lines:
        if line.strip().startswith('INSERT INTO'):
            fixed_line = fix_insert_statement(line)
            fixed_lines.append(fixed_line)
        else:
            fixed_lines.append(line)
    
    # Write fixed content
    fixed_content = '\n'.join(fixed_lines)
    
    with open('migration-data-fixed.sql', 'w', encoding='utf-8') as f:
        f.write(fixed_content)
    
    print("✅ Fixed migration saved as: migration-data-fixed.sql")
    print("🎯 You can now run this file in Supabase SQL Editor")

def fix_insert_statement(line):
    """Fix individual INSERT statement"""
    
    # Pattern untuk menangkap INSERT statement
    pattern = r'INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\);'
    match = re.match(pattern, line)
    
    if not match:
        return line
    
    table_name = match.group(1)
    columns = match.group(2)
    values = match.group(3)
    
    # Split columns dan values
    column_list = [col.strip() for col in columns.split(',')]
    value_list = parse_values(values)
    
    # Jika ada kolom 'id' di posisi pertama, hapus dan ganti dengan UUID
    if column_list[0] == 'id':
        # Hapus kolom id
        column_list = column_list[1:]
        value_list = value_list[1:]
        
        # Atau ganti dengan UUID (uncomment jika ingin keep ID column)
        # value_list[0] = f"'{generate_uuid()}'"
    
    # Rebuild INSERT statement
    new_columns = ', '.join(column_list)
    new_values = ', '.join(value_list)
    
    return f"INSERT INTO {table_name} ({new_columns}) VALUES ({new_values});"

def parse_values(values_str):
    """Parse values string dengan handling untuk string yang mengandung koma"""
    values = []
    current_value = ""
    in_quotes = False
    quote_char = None
    
    i = 0
    while i < len(values_str):
        char = values_str[i]
        
        if char in ["'", '"'] and not in_quotes:
            in_quotes = True
            quote_char = char
            current_value += char
        elif char == quote_char and in_quotes:
            in_quotes = False
            quote_char = None
            current_value += char
        elif char == ',' and not in_quotes:
            values.append(current_value.strip())
            current_value = ""
        else:
            current_value += char
        
        i += 1
    
    # Add last value
    if current_value.strip():
        values.append(current_value.strip())
    
    return values

def create_clean_migration():
    """Create a clean migration file with sample data"""
    
    clean_sql = """-- =====================================================
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
"""
    
    with open('migration-clean-data.sql', 'w', encoding='utf-8') as f:
        f.write(clean_sql)
    
    print("✅ Clean migration created: migration-clean-data.sql")
    print("🎯 This file contains sample data and is safe to run")

if __name__ == "__main__":
    print("🎯 KakaRama Room - Migration Data Fixer")
    print("=====================================")
    
    # Fix existing migration file
    fix_migration_sql()
    
    # Create clean migration with sample data
    create_clean_migration()
    
    print("\n📋 Files created:")
    print("1. migration-data.sql.backup - Original backup")
    print("2. migration-data-fixed.sql - Fixed version")
    print("3. migration-clean-data.sql - Clean sample data")
    
    print("\n🚀 Next steps:")
    print("1. Run supabase-schema.sql in Supabase SQL Editor")
    print("2. Run migration-clean-data.sql for sample data")
    print("3. Or run migration-data-fixed.sql for original data")
