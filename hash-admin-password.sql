-- Script untuk hash password admin di Supabase
-- Jalankan di SQL Editor Supabase

-- Install pgcrypto extension jika belum ada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Update password admin menjadi hashed version
-- Password: admin123
-- Hash: $2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi

UPDATE admins 
SET password = crypt('admin123', gen_salt('bf', 10))
WHERE username = 'admin';

-- Jika belum ada admin, insert dengan hashed password
INSERT INTO admins (username, password, full_name, email, phone, created_at, updated_at)
SELECT 'admin', crypt('admin123', gen_salt('bf', 10)), 'Administrator', 'admin@kakaramaroom.com', '+62812345678', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE username = 'admin');

-- Verify hasil
SELECT 
    id,
    username,
    full_name,
    email,
    phone,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 10) as password_prefix,
    created_at
FROM admins 
WHERE username = 'admin';

-- Create function untuk verify password
CREATE OR REPLACE FUNCTION verify_password(input_password TEXT, stored_hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Cek apakah stored_hash adalah bcrypt hash
    IF stored_hash ~ '^\$2[ab]\$\d{2}\$' THEN
        -- Gunakan crypt untuk bcrypt
        RETURN stored_hash = crypt(input_password, stored_hash);
    ELSE
        -- Fallback untuk plain text (development only)
        RETURN input_password = stored_hash;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test password verification
-- Ini akan return true jika password benar
SELECT
    username,
    verify_password('admin123', password) as password_match
FROM admins
WHERE username = 'admin';
