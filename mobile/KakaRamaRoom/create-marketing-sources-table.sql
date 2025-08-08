-- Create marketing_sources table for select2 functionality
-- Run this in Supabase SQL Editor

-- Create marketing_sources table
CREATE TABLE IF NOT EXISTS marketing_sources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_marketing_sources_name ON marketing_sources(name);
CREATE INDEX IF NOT EXISTS idx_marketing_sources_active ON marketing_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_marketing_sources_usage ON marketing_sources(usage_count DESC);

-- Insert default marketing sources
INSERT INTO marketing_sources (name, description) VALUES
('Instagram', 'Social media Instagram'),
('Facebook', 'Social media Facebook'),
('WhatsApp', 'WhatsApp marketing'),
('Google Ads', 'Google advertising'),
('Referral', 'Referensi dari teman'),
('Walk-in', 'Datang langsung'),
('Website', 'Website resmi'),
('Tiktok', 'Social media Tiktok'),
('Twitter', 'Social media Twitter'),
('Marketplace', 'Platform marketplace')
ON CONFLICT (name) DO NOTHING;

-- Create function to increment usage count
CREATE OR REPLACE FUNCTION increment_marketing_usage(marketing_name VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE marketing_sources 
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE name = marketing_name AND is_active = true;
END;
$$ LANGUAGE plpgsql;

-- Create function to add new marketing source if not exists
CREATE OR REPLACE FUNCTION add_marketing_source_if_not_exists(marketing_name VARCHAR)
RETURNS UUID AS $$
DECLARE
    source_id UUID;
BEGIN
    -- Try to find existing source
    SELECT id INTO source_id 
    FROM marketing_sources 
    WHERE name = marketing_name;
    
    -- If not found, create new one
    IF source_id IS NULL THEN
        INSERT INTO marketing_sources (name, usage_count)
        VALUES (marketing_name, 1)
        RETURNING id INTO source_id;
    ELSE
        -- Increment usage count
        PERFORM increment_marketing_usage(marketing_name);
    END IF;
    
    RETURN source_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE marketing_sources ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow all for authenticated users" ON marketing_sources
FOR ALL USING (auth.uid() IS NOT NULL);

-- Grant permissions
GRANT ALL ON marketing_sources TO authenticated;
GRANT EXECUTE ON FUNCTION increment_marketing_usage(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION add_marketing_source_if_not_exists(VARCHAR) TO authenticated;

-- Show created table
SELECT * FROM marketing_sources ORDER BY usage_count DESC, name;
