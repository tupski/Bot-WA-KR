-- Safe activity_logs table creation for KakaRama Room
-- Run this in Supabase SQL Editor

-- Drop existing table if you want to recreate (CAREFUL!)
-- DROP TABLE IF EXISTS activity_logs CASCADE;

-- Create activity_logs table (simple version)
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    user_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type ON activity_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow service role to insert activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Allow service role to read all activity logs" ON activity_logs;

-- Create policies
CREATE POLICY "Allow authenticated users to read activity logs" 
ON activity_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow service role to insert activity logs" 
ON activity_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

CREATE POLICY "Allow service role to read all activity logs" 
ON activity_logs FOR SELECT 
TO service_role 
USING (true);

-- Enable real-time (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- Test the table by inserting a simple record
INSERT INTO activity_logs (user_id, user_type, action, description) 
VALUES (gen_random_uuid(), 'admin', 'test', 'Testing activity logs table creation');

-- Verify table works
SELECT 
    id,
    user_type,
    action,
    description,
    created_at
FROM activity_logs 
ORDER BY created_at DESC 
LIMIT 5;

-- Show table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
ORDER BY ordinal_position;
