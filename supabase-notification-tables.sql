-- SQL untuk membuat tabel notifikasi di Supabase
-- Jalankan script ini di Supabase SQL Editor

-- Tabel untuk menyimpan FCM tokens pengguna
CREATE TABLE IF NOT EXISTS user_fcm_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'field_team')),
    fcm_token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, user_type)
);

-- Tabel untuk menyimpan notifikasi pengguna
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'field_team')),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabel untuk menyimpan broadcast notifications
CREATE TABLE IF NOT EXISTS broadcast_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    target_user_type VARCHAR(20) NOT NULL CHECK (target_user_type IN ('all', 'admin', 'field_team')),
    sent_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Tambah kolom untuk tracking notification reminder di tabel checkins
ALTER TABLE checkins 
ADD COLUMN IF NOT EXISTS reminder_30min_sent TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS overdue_notification_sent TIMESTAMP WITH TIME ZONE;

-- Index untuk performa
CREATE INDEX IF NOT EXISTS idx_user_fcm_tokens_user ON user_fcm_tokens(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkins_reminder ON checkins(reminder_30min_sent);
CREATE INDEX IF NOT EXISTS idx_checkins_overdue ON checkins(overdue_notification_sent);

-- RLS (Row Level Security) policies
ALTER TABLE user_fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_notifications ENABLE ROW LEVEL SECURITY;

-- Policy untuk user_fcm_tokens - users can only access their own tokens
CREATE POLICY "Users can manage their own FCM tokens" ON user_fcm_tokens
    FOR ALL USING (
        auth.uid()::text = user_id::text OR
        EXISTS (
            SELECT 1 FROM field_teams
            WHERE id = auth.uid()
            AND status = 'active'
        )
    );

-- Policy untuk notifications - users can only access their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
    FOR SELECT USING (
        auth.uid()::text = user_id::text OR
        EXISTS (
            SELECT 1 FROM field_teams
            WHERE id = auth.uid()
            AND status = 'active'
        )
    );

CREATE POLICY "Users can update their own notifications" ON notifications
    FOR UPDATE USING (
        auth.uid()::text = user_id::text OR
        EXISTS (
            SELECT 1 FROM field_teams
            WHERE id = auth.uid()
            AND status = 'active'
        )
    );

-- Policy untuk broadcast_notifications - allow all authenticated users to create for now
-- (You can restrict this later based on your admin table structure)
CREATE POLICY "Authenticated users can create broadcast notifications" ON broadcast_notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view broadcast notifications" ON broadcast_notifications
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Function untuk auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger untuk auto-update updated_at di user_fcm_tokens
CREATE TRIGGER update_user_fcm_tokens_updated_at 
    BEFORE UPDATE ON user_fcm_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions untuk authenticated users
GRANT SELECT, INSERT, UPDATE ON user_fcm_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT ON broadcast_notifications TO authenticated;
