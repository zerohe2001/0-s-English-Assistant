-- =====================================================
-- Profile Table Migration - 2026-01-20
-- Purpose: Add new profile fields (city, occupation, hobbies, frequentPlaces)
-- =====================================================

-- STEP 1: Backup existing data
CREATE TABLE IF NOT EXISTS profiles_backup_20260120 AS
SELECT * FROM profiles;

-- Verify backup
SELECT COUNT(*) as backup_count FROM profiles_backup_20260120;

-- STEP 2: Add new columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS occupation TEXT,
  ADD COLUMN IF NOT EXISTS hobbies TEXT,
  ADD COLUMN IF NOT EXISTS frequent_places TEXT;

-- STEP 3: Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name IN ('city', 'occupation', 'hobbies', 'frequent_places')
ORDER BY column_name;

-- Expected: 4 rows

-- STEP 4: Check existing data
SELECT
  id,
  user_id,
  name,
  city,
  occupation,
  hobbies,
  frequent_places
FROM profiles;

-- Success message
SELECT '✅ Profile migration completed! New fields: city, occupation, hobbies, frequent_places' as status;
