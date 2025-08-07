-- Check existing table structures in Supabase
-- Run this to understand your current database schema

-- Check if activity_logs table exists
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'activity_logs';

-- Check activity_logs table structure if it exists
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'activity_logs' 
ORDER BY ordinal_position;

-- Check for any enum types related to activity_logs
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%activity%'
ORDER BY t.typname, e.enumsortorder;

-- Check constraints on activity_logs table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'activity_logs';

-- List all tables in public schema
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check sample data in activity_logs (if exists)
SELECT 
    id,
    user_id,
    user_type,
    action,
    description,
    created_at
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 5;
