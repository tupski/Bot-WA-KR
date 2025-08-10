-- Test script untuk memverifikasi team assignment
-- Jalankan script ini untuk memastikan tim lapangan sudah di-assign ke apartemen

SELECT '🔍 Checking team assignments...' as status;

-- Check field teams
SELECT 
  'Field Teams:' as section,
  id,
  full_name,
  username,
  role,
  created_at
FROM field_teams
ORDER BY full_name;

-- Check apartments
SELECT 
  'Apartments:' as section,
  id,
  name,
  code,
  created_at
FROM apartments
ORDER BY name;

-- Check team apartment assignments
SELECT 
  'Team Assignments:' as section,
  taa.id,
  ft.full_name as team_name,
  ft.username as team_username,
  a.name as apartment_name,
  a.code as apartment_code,
  taa.assigned_at
FROM team_apartment_assignments taa
JOIN field_teams ft ON taa.team_id = ft.id
JOIN apartments a ON taa.apartment_id = a.id
ORDER BY ft.full_name, a.name;

-- Check if any teams have no assignments
SELECT 
  'Teams without assignments:' as section,
  ft.id,
  ft.full_name,
  ft.username
FROM field_teams ft
LEFT JOIN team_apartment_assignments taa ON ft.id = taa.team_id
WHERE taa.team_id IS NULL;

-- Check if any apartments have no assignments
SELECT 
  'Apartments without assignments:' as section,
  a.id,
  a.name,
  a.code
FROM apartments a
LEFT JOIN team_apartment_assignments taa ON a.id = taa.apartment_id
WHERE taa.apartment_id IS NULL;

-- Summary
SELECT 
  'Summary:' as section,
  (SELECT COUNT(*) FROM field_teams) as total_teams,
  (SELECT COUNT(*) FROM apartments) as total_apartments,
  (SELECT COUNT(*) FROM team_apartment_assignments) as total_assignments,
  (SELECT COUNT(DISTINCT team_id) FROM team_apartment_assignments) as teams_with_assignments,
  (SELECT COUNT(DISTINCT apartment_id) FROM team_apartment_assignments) as apartments_with_assignments;

-- Create sample assignments if none exist
DO $$
DECLARE
  team_count INTEGER;
  apartment_count INTEGER;
  assignment_count INTEGER;
  team_rec RECORD;
  apt_rec RECORD;
BEGIN
  SELECT COUNT(*) INTO team_count FROM field_teams;
  SELECT COUNT(*) INTO apartment_count FROM apartments;
  SELECT COUNT(*) INTO assignment_count FROM team_apartment_assignments;
  
  RAISE NOTICE 'Teams: %, Apartments: %, Assignments: %', team_count, apartment_count, assignment_count;
  
  -- If we have teams and apartments but no assignments, create some
  IF team_count > 0 AND apartment_count > 0 AND assignment_count = 0 THEN
    RAISE NOTICE 'Creating sample assignments...';
    
    -- Assign each team to all apartments (for testing)
    FOR team_rec IN SELECT id FROM field_teams LOOP
      FOR apt_rec IN SELECT id FROM apartments LOOP
        INSERT INTO team_apartment_assignments (team_id, apartment_id)
        VALUES (team_rec.id, apt_rec.id)
        ON CONFLICT (team_id, apartment_id) DO NOTHING;
      END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Sample assignments created!';
  END IF;
END $$;

-- Check assignments again after potential creation
SELECT 
  'Final Team Assignments:' as section,
  taa.id,
  ft.full_name as team_name,
  ft.username as team_username,
  a.name as apartment_name,
  a.code as apartment_code,
  taa.assigned_at
FROM team_apartment_assignments taa
JOIN field_teams ft ON taa.team_id = ft.id
JOIN apartments a ON taa.apartment_id = a.id
ORDER BY ft.full_name, a.name;

SELECT '✅ Team assignment check completed!' as status;
