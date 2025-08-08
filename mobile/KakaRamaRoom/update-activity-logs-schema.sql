-- Update activity_logs table untuk detail logging
-- Run this in Supabase SQL Editor

-- Add new columns for detailed logging
DO $$
BEGIN
    -- Add user_name column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'user_name'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN user_name VARCHAR(255);
    END IF;

    -- Add user_username column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'user_username'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN user_username VARCHAR(100);
    END IF;

    -- Add apartment_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'apartment_id'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN apartment_id UUID REFERENCES apartments(id);
    END IF;

    -- Add unit_id column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'unit_id'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN unit_id UUID REFERENCES units(id);
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_name ON activity_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_apartment_id ON activity_logs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_unit_id ON activity_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type_action ON activity_logs(user_type, action);

-- Add comments for documentation
COMMENT ON COLUMN activity_logs.user_name IS 'Full name of the user who performed the action';
COMMENT ON COLUMN activity_logs.user_username IS 'Username of the user who performed the action';
COMMENT ON COLUMN activity_logs.apartment_id IS 'Related apartment ID for the action';
COMMENT ON COLUMN activity_logs.unit_id IS 'Related unit ID for the action';

-- Create view for detailed activity logs with joins
CREATE OR REPLACE VIEW activity_logs_detailed AS
SELECT 
    al.*,
    a.name as apartment_name,
    a.code as apartment_code,
    u.unit_number,
    u.status as unit_status,
    CASE 
        WHEN al.user_type = 'admin' THEN 'Administrator'
        WHEN al.user_type = 'field_team' THEN 'Tim Lapangan'
        ELSE al.user_type
    END as user_type_label,
    DATE(al.created_at) as activity_date,
    TO_CHAR(al.created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS') as activity_time,
    TO_CHAR(al.created_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY') as activity_date_formatted
FROM activity_logs al
LEFT JOIN apartments a ON al.apartment_id = a.id
LEFT JOIN units u ON al.unit_id = u.id
ORDER BY al.created_at DESC;

-- Grant permissions for the view
GRANT SELECT ON activity_logs_detailed TO authenticated;

-- Show updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;
