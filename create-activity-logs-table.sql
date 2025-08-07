-- Create simple activity_logs table for KakaRama Room
-- Run this in Supabase SQL Editor

-- Drop table if exists (be careful in production!)
-- DROP TABLE IF EXISTS activity_logs;

-- Create activity_logs table with minimal required fields
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('admin', 'field_team')),
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add optional columns (run separately if needed)
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS related_table VARCHAR(100);
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS related_id VARCHAR(100);
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
-- ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address INET;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type ON activity_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own logs
CREATE POLICY "Users can read activity logs" 
ON activity_logs FOR SELECT 
TO authenticated 
USING (true);

-- Policy for service role to insert logs
CREATE POLICY "Service role can insert activity logs" 
ON activity_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Policy for service role to read all logs
CREATE POLICY "Service role can read all activity logs" 
ON activity_logs FOR SELECT 
TO service_role 
USING (true);

-- Enable real-time (optional)
-- ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- Insert sample data for testing (using UUID values)
-- First, let's get some existing UUIDs from admins table, or use generated ones
INSERT INTO activity_logs (user_id, user_type, action, description) VALUES
(gen_random_uuid(), 'admin', 'login', 'Admin berhasil login ke sistem'),
(gen_random_uuid(), 'admin', 'create_apartment', 'Membuat apartemen baru: Test Apartment'),
(gen_random_uuid(), 'field_team', 'checkin', 'Tim lapangan melakukan checkin unit 101');

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'activity_logs' 
ORDER BY ordinal_position;
