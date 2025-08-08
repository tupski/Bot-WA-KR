-- Minimal update for activity_logs table
-- Run each section separately in Supabase SQL Editor

-- Section 1: Add columns one by one
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_username VARCHAR(100);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS apartment_id UUID;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS unit_id UUID;

-- Section 2: Add indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_name ON activity_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_apartment_id ON activity_logs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_unit_id ON activity_logs(unit_id);

-- Section 3: Drop existing view if exists
DROP VIEW IF EXISTS activity_logs_detailed;

-- Section 4: Create simple view without CASE statements
CREATE VIEW activity_logs_detailed AS
SELECT 
    al.*,
    a.name as apartment_name,
    a.code as apartment_code,
    u.unit_number,
    u.status as unit_status,
    DATE(al.created_at) as activity_date
FROM activity_logs al
LEFT JOIN apartments a ON al.apartment_id = a.id
LEFT JOIN units u ON al.unit_id = u.id
ORDER BY al.created_at DESC;

-- Section 5: Grant permissions
GRANT SELECT ON activity_logs_detailed TO authenticated;
