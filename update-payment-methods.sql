-- Update payment methods enum
-- Run this in Supabase SQL Editor

-- Drop existing enum if exists and recreate with new values
DO $$
BEGIN
    -- Check if enum exists
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        -- Drop the enum (this will fail if it's being used)
        -- So we'll alter the enum instead
        
        -- Add new enum values if they don't exist
        BEGIN
            ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer_kr';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'transfer_amel';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'cash_amel';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        BEGIN
            ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'apk';
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END;
        
        RAISE NOTICE 'Payment method enum updated successfully';
    ELSE
        -- Create new enum with all values
        CREATE TYPE payment_method AS ENUM (
            'cash',
            'transfer',
            'transfer_kr', 
            'transfer_amel',
            'cash_amel',
            'qris',
            'apk'
        );
        RAISE NOTICE 'Payment method enum created successfully';
    END IF;
END $$;

-- Show current enum values
SELECT enumlabel as payment_methods 
FROM pg_enum 
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'payment_method'
)
ORDER BY enumsortorder;
