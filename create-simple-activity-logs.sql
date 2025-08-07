-- Simple activity_logs table for KakaRama Room
-- Run this in Supabase SQL Editor

-- Create activity_logs table with UUID compatibility
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    user_type VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type ON activity_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read logs
CREATE POLICY "Allow authenticated users to read activity logs" 
ON activity_logs FOR SELECT 
TO authenticated 
USING (true);

-- Policy for service role to insert logs
CREATE POLICY "Allow service role to insert activity logs" 
ON activity_logs FOR INSERT 
TO service_role 
WITH CHECK (true);

-- Policy for service role to read all logs
CREATE POLICY "Allow service role to read all activity logs" 
ON activity_logs FOR SELECT 
TO service_role 
USING (true);

-- Insert sample data for testing (using valid enum values)
INSERT INTO activity_logs (user_id, user_type, action, description) VALUES
(gen_random_uuid(), 'admin', 'login', 'Admin berhasil login ke sistem'),
(gen_random_uuid(), 'admin', 'create', 'Tabel activity_logs berhasil dibuat');

-- Verify table creation
SELECT COUNT(*) as total_logs FROM activity_logs;
