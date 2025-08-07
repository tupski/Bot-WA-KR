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

-- ========================================
-- FIELD TEAMS TABLE UPDATES
-- ========================================

-- Update field_teams table structure
ALTER TABLE field_teams
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing field teams to use phone_number instead of username
UPDATE field_teams
SET phone_number = COALESCE(phone, username)
WHERE phone_number IS NULL;

-- Hash existing plain text passwords in field_teams
UPDATE field_teams
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL
  AND NOT (password ~ '^\$2[ab]\$\d{2}\$');

-- Create sample field team with hashed password
INSERT INTO field_teams (full_name, phone_number, password, is_active, created_at, updated_at)
SELECT 'Tim Lapangan 1', '+6281234567890', crypt('field123', gen_salt('bf', 10)), true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM field_teams WHERE phone_number = '+6281234567890');

-- ========================================
-- DATABASE FUNCTIONS FOR PROFILE MANAGEMENT
-- ========================================

-- Function to update admin profile
CREATE OR REPLACE FUNCTION update_admin_profile(
    admin_id INTEGER,
    new_full_name TEXT,
    new_email TEXT DEFAULT NULL,
    new_password TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE admins
    SET
        full_name = new_full_name,
        email = COALESCE(new_email, email),
        password = COALESCE(new_password, password),
        updated_at = NOW()
    WHERE id = admin_id;

    IF FOUND THEN
        result := json_build_object('success', true, 'message', 'Admin profile updated successfully');
    ELSE
        result := json_build_object('success', false, 'message', 'Admin not found');
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update field team profile
CREATE OR REPLACE FUNCTION update_field_team_profile(
    team_id INTEGER,
    new_full_name TEXT,
    new_phone_number TEXT DEFAULT NULL,
    new_password TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    UPDATE field_teams
    SET
        full_name = new_full_name,
        phone_number = COALESCE(new_phone_number, phone_number),
        password = COALESCE(new_password, password),
        updated_at = NOW()
    WHERE id = team_id;

    IF FOUND THEN
        result := json_build_object('success', true, 'message', 'Field team profile updated successfully');
    ELSE
        result := json_build_object('success', false, 'message', 'Field team not found');
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create field team
CREATE OR REPLACE FUNCTION create_field_team(
    team_full_name TEXT,
    team_phone_number TEXT,
    team_password TEXT
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    new_team_id INTEGER;
BEGIN
    -- Check if phone number already exists
    IF EXISTS (SELECT 1 FROM field_teams WHERE phone_number = team_phone_number) THEN
        result := json_build_object('success', false, 'message', 'Nomor WhatsApp sudah terdaftar');
        RETURN result;
    END IF;

    INSERT INTO field_teams (full_name, phone_number, password, is_active, created_at, updated_at)
    VALUES (team_full_name, team_phone_number, team_password, true, NOW(), NOW())
    RETURNING id INTO new_team_id;

    result := json_build_object('success', true, 'message', 'Field team created successfully', 'id', new_team_id);
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to delete field team
CREATE OR REPLACE FUNCTION delete_field_team(team_id INTEGER)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    DELETE FROM field_teams WHERE id = team_id;

    IF FOUND THEN
        result := json_build_object('success', true, 'message', 'Field team deleted successfully');
    ELSE
        result := json_build_object('success', false, 'message', 'Field team not found');
    END IF;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify admin password hashing
SELECT
    id,
    username,
    full_name,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 10) as password_prefix,
    verify_password('admin123', password) as password_test
FROM admins
WHERE username = 'admin';

-- Verify field team setup
SELECT
    id,
    full_name,
    phone_number,
    is_active,
    LENGTH(password) as password_length,
    SUBSTRING(password, 1, 10) as password_prefix,
    verify_password('field123', password) as password_test
FROM field_teams
WHERE phone_number = '+6281234567890';

-- Show all field teams
SELECT
    id,
    full_name,
    phone_number,
    is_active,
    created_at
FROM field_teams
ORDER BY created_at DESC;
