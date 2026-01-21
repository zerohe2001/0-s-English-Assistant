-- Add check_in_history column to profiles table for daily study tracking
-- This column stores an array of CheckInRecord objects in JSONB format

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS check_in_history JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN profiles.check_in_history IS 'Daily check-in records for study tracking. Each record contains: date (YYYY-MM-DD), groupsCompleted (number), wordsLearned (string[]), createdAt (ISO string)';
