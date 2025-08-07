-- Test activity_logs table without inserting data
-- Run this to verify the table works

-- Check table exists
SELECT 'activity_logs table exists' as status;

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
ORDER BY ordinal_position;

-- Check existing data count
SELECT COUNT(*) as total_existing_logs FROM activity_logs;

-- Check enum values for activity_action
SELECT 
    t.typname as enum_name,
    e.enumlabel as valid_action_values
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'activity_action'
ORDER BY e.enumsortorder;

-- Show sample existing data (if any)
SELECT 
    user_type,
    action,
    description,
    created_at
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 3;
