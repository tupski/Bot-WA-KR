-- =====================================================
-- KakaRama Room - Database Schema Verification
-- =====================================================
-- 
-- Run this script AFTER running supabase-schema.sql
-- to verify that all tables, indexes, and functions
-- were created successfully.
--
-- =====================================================

SELECT '🔍 Verifying KakaRama Room Database Schema...' as status;
SELECT '================================================' as separator;

-- Check all tables exist
SELECT '📋 Checking tables...' as status;

WITH expected_tables AS (
  SELECT unnest(ARRAY[
    'admins', 'apartments', 'field_teams', 'units', 
    'team_apartment_assignments', 'checkins', 'checkin_extensions', 
    'activity_logs', 'transactions', 'cs_summary', 'daily_summary', 
    'processed_messages', 'config'
  ]) as table_name
),
existing_tables AS (
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
)
SELECT 
  et.table_name,
  CASE 
    WHEN ext.table_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_tables et
LEFT JOIN existing_tables ext ON et.table_name = ext.table_name
ORDER BY et.table_name;

-- Check views exist
SELECT '👁️  Checking views...' as status;

WITH expected_views AS (
  SELECT unnest(ARRAY[
    'checkins_with_details', 'units_with_apartment'
  ]) as view_name
),
existing_views AS (
  SELECT table_name as view_name
  FROM information_schema.views 
  WHERE table_schema = 'public'
)
SELECT 
  ev.view_name,
  CASE 
    WHEN ext.view_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_views ev
LEFT JOIN existing_views ext ON ev.view_name = ext.view_name
ORDER BY ev.view_name;

-- Check functions exist
SELECT '🔧 Checking functions...' as status;

WITH expected_functions AS (
  SELECT unnest(ARRAY[
    'update_updated_at_column', 'get_active_checkins', 'process_auto_checkout'
  ]) as function_name
),
existing_functions AS (
  SELECT routine_name as function_name
  FROM information_schema.routines 
  WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
)
SELECT 
  ef.function_name,
  CASE 
    WHEN ext.function_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_functions ef
LEFT JOIN existing_functions ext ON ef.function_name = ext.function_name
ORDER BY ef.function_name;

-- Check custom types exist
SELECT '📝 Checking custom types...' as status;

WITH expected_types AS (
  SELECT unnest(ARRAY[
    'user_role', 'unit_status', 'checkin_status', 'activity_action'
  ]) as type_name
),
existing_types AS (
  SELECT typname as type_name
  FROM pg_type 
  WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND typtype = 'e'  -- enum types
)
SELECT 
  et.type_name,
  CASE 
    WHEN ext.type_name IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_types et
LEFT JOIN existing_types ext ON et.type_name = ext.type_name
ORDER BY et.type_name;

-- Check indexes exist
SELECT '📊 Checking indexes...' as status;

SELECT 
  schemaname,
  tablename,
  indexname,
  '✅ EXISTS' as status
FROM pg_indexes 
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check RLS is enabled
SELECT '🔒 Checking Row Level Security...' as status;

SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check policies exist
SELECT '🛡️  Checking RLS Policies...' as status;

SELECT 
  schemaname,
  tablename,
  policyname,
  '✅ EXISTS' as status
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check triggers exist
SELECT '⚡ Checking triggers...' as status;

SELECT 
  trigger_schema,
  event_object_table as table_name,
  trigger_name,
  '✅ EXISTS' as status
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- Test sample queries
SELECT '🧪 Testing sample queries...' as status;

-- Test admin user exists
SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Default admin user exists'
    ELSE '❌ Default admin user missing'
  END as admin_test
FROM admins 
WHERE username = 'admin';

-- Test views work
SELECT 
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Views are queryable'
    ELSE '❌ Views have issues'
  END as view_test
FROM checkins_with_details
LIMIT 1;

-- Test functions work
SELECT 
  CASE 
    WHEN get_active_checkins IS NOT NULL THEN '✅ Functions are callable'
    ELSE '❌ Functions have issues'
  END as function_test
FROM (SELECT get_active_checkins() LIMIT 0) t;

-- Final summary
SELECT '================================================' as separator;
SELECT '📊 VERIFICATION SUMMARY' as status;
SELECT '================================================' as separator;

SELECT 
  'Total tables: ' || COUNT(*) as summary
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

SELECT 
  'Total views: ' || COUNT(*) as summary
FROM information_schema.views 
WHERE table_schema = 'public';

SELECT 
  'Total functions: ' || COUNT(*) as summary
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

SELECT 
  'Total indexes: ' || COUNT(*) as summary
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%';

SELECT 
  'Total policies: ' || COUNT(*) as summary
FROM pg_policies 
WHERE schemaname = 'public';

SELECT 
  'Total triggers: ' || COUNT(*) as summary
FROM information_schema.triggers 
WHERE trigger_schema = 'public';

SELECT '✅ Schema verification completed!' as status;
SELECT 'Timestamp: ' || NOW() as timestamp;
