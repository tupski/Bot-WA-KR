-- Add marketing_commission column to checkins table
-- Run this in Supabase SQL Editor

-- Add marketing_commission column
ALTER TABLE checkins 
ADD COLUMN IF NOT EXISTS marketing_commission DECIMAL(15,2) DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN checkins.marketing_commission IS 'Komisi marketing dalam rupiah';

-- Create index for better performance on commission queries
CREATE INDEX IF NOT EXISTS idx_checkins_marketing_commission ON checkins(marketing_commission);

-- Update existing records to have 0 commission if null
UPDATE checkins 
SET marketing_commission = 0 
WHERE marketing_commission IS NULL;

-- Show updated table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_name = 'checkins'
AND column_name IN ('payment_amount', 'marketing_commission')
ORDER BY ordinal_position;
