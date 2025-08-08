-- Add cleaning management columns to units table
-- Run this in Supabase SQL Editor

-- Add cleaning_extended_minutes column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'units' 
        AND column_name = 'cleaning_extended_minutes'
    ) THEN
        ALTER TABLE units ADD COLUMN cleaning_extended_minutes INTEGER DEFAULT 0;
    END IF;
END $$;

-- Update existing units to have default value
UPDATE units 
SET cleaning_extended_minutes = 0 
WHERE cleaning_extended_minutes IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN units.cleaning_extended_minutes IS 'Additional minutes added to cleaning time (max 10 minutes)';

-- Show updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'units'
ORDER BY ordinal_position;
