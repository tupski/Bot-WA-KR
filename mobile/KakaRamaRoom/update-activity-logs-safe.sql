-- Safe update for activity_logs table
-- Run this step by step in Supabase SQL Editor

-- Step 1: Check if columns exist before adding them
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
AND column_name IN ('user_name', 'user_username', 'apartment_id', 'unit_id');

-- Step 2: Add user_name column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'user_name'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN user_name VARCHAR(255);
        RAISE NOTICE 'Added user_name column';
    ELSE
        RAISE NOTICE 'user_name column already exists';
    END IF;
END $$;

-- Step 3: Add user_username column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'user_username'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN user_username VARCHAR(100);
        RAISE NOTICE 'Added user_username column';
    ELSE
        RAISE NOTICE 'user_username column already exists';
    END IF;
END $$;

-- Step 4: Add apartment_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'apartment_id'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN apartment_id UUID;
        RAISE NOTICE 'Added apartment_id column';
    ELSE
        RAISE NOTICE 'apartment_id column already exists';
    END IF;
END $$;

-- Step 5: Add unit_id column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' 
        AND column_name = 'unit_id'
    ) THEN
        ALTER TABLE activity_logs ADD COLUMN unit_id UUID;
        RAISE NOTICE 'Added unit_id column';
    ELSE
        RAISE NOTICE 'unit_id column already exists';
    END IF;
END $$;

-- Step 6: Add foreign key constraints if they don't exist
DO $$
BEGIN
    -- Add apartment_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activity_logs_apartment_id_fkey'
    ) THEN
        ALTER TABLE activity_logs 
        ADD CONSTRAINT activity_logs_apartment_id_fkey 
        FOREIGN KEY (apartment_id) REFERENCES apartments(id);
        RAISE NOTICE 'Added apartment_id foreign key';
    ELSE
        RAISE NOTICE 'apartment_id foreign key already exists';
    END IF;

    -- Add unit_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'activity_logs_unit_id_fkey'
    ) THEN
        ALTER TABLE activity_logs 
        ADD CONSTRAINT activity_logs_unit_id_fkey 
        FOREIGN KEY (unit_id) REFERENCES units(id);
        RAISE NOTICE 'Added unit_id foreign key';
    ELSE
        RAISE NOTICE 'unit_id foreign key already exists';
    END IF;
END $$;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_name ON activity_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_activity_logs_apartment_id ON activity_logs(apartment_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_unit_id ON activity_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type_action ON activity_logs(user_type, action);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN activity_logs.user_name IS 'Full name of the user who performed the action';
COMMENT ON COLUMN activity_logs.user_username IS 'Username of the user who performed the action';
COMMENT ON COLUMN activity_logs.apartment_id IS 'Related apartment ID for the action';
COMMENT ON COLUMN activity_logs.unit_id IS 'Related unit ID for the action';

-- Step 9: Drop existing view if exists
DROP VIEW IF EXISTS activity_logs_detailed;

-- Step 10: Create view without enum conflicts
CREATE VIEW activity_logs_detailed AS
SELECT 
    al.id,
    al.user_id,
    al.user_type,
    al.user_name,
    al.user_username,
    al.action,
    al.description,
    al.related_table,
    al.related_id,
    al.apartment_id,
    al.unit_id,
    al.ip_address,
    al.user_agent,
    al.created_at,
    al.updated_at,
    a.name as apartment_name,
    a.code as apartment_code,
    u.unit_number,
    u.status as unit_status,
    -- Safe user type label without enum conflicts
    CASE 
        WHEN al.user_type = 'admin' THEN 'Administrator'
        WHEN al.user_type = 'field_team' THEN 'Tim Lapangan'
        ELSE COALESCE(al.user_type, 'Unknown')
    END as user_type_label,
    DATE(al.created_at) as activity_date,
    TO_CHAR(al.created_at AT TIME ZONE 'Asia/Jakarta', 'HH24:MI:SS') as activity_time,
    TO_CHAR(al.created_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY') as activity_date_formatted
FROM activity_logs al
LEFT JOIN apartments a ON al.apartment_id = a.id
LEFT JOIN units u ON al.unit_id = u.id
ORDER BY al.created_at DESC;

-- Step 11: Grant permissions for the view
GRANT SELECT ON activity_logs_detailed TO authenticated;

-- Step 12: Show final table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;

-- Step 13: Test the view
SELECT COUNT(*) as total_logs FROM activity_logs_detailed;

RAISE NOTICE 'Activity logs schema update completed successfully!';
