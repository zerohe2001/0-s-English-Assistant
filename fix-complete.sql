-- =====================================================
-- Complete Fix for Words Data Issues
-- User: lin.hecafa@gmail.com
-- User ID: 9fb717d0-3d44-44ef-bffb-307b1864712a
-- =====================================================

-- Problem 1: Check for duplicate words
SELECT
  text,
  COUNT(*) as duplicate_count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
GROUP BY text
HAVING COUNT(*) > 1;

-- Problem 2: user_sentences is string "[]" instead of JSONB array []
-- Fix: Convert string "[]" to proper JSONB empty array []
UPDATE words
SET
  user_sentences = '[]'::jsonb,
  updated_at = NOW()
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND jsonb_typeof(user_sentences) = 'string'
  AND user_sentences::text = '"[]"';

-- Verify the fix
SELECT
  'After Fix' as status,
  jsonb_typeof(user_sentences) as data_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
GROUP BY jsonb_typeof(user_sentences);

-- Check sample words after fix
SELECT
  text,
  user_sentences,
  jsonb_typeof(user_sentences) as json_type,
  next_review_date,
  review_count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
ORDER BY text
LIMIT 10;
