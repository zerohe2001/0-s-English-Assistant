-- =====================================================
-- Fix Words Data Integrity Issues
-- User: lin.hecafa@gmail.com
-- User ID: 9fb717d0-3d44-44ef-bffb-307b1864712a
-- =====================================================
--
-- Problem Identified:
-- - 25 learned words have user_sentences stored as STRING instead of ARRAY
-- - This causes frontend to show "Added date" instead of "Review date"
--
-- Solution:
-- - Convert string-type user_sentences to proper JSONB array format
-- - This will allow frontend to correctly recognize learned words
-- =====================================================

-- Fix: Convert string-type user_sentences to JSONB arrays
UPDATE words
SET
  user_sentences = user_sentences::text::jsonb,
  updated_at = NOW()
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
  AND jsonb_typeof(user_sentences) = 'string';

-- =====================================================
-- Verification Query (Run this after the update)
-- =====================================================

-- Check 1: Verify all user_sentences are now arrays
SELECT
  '✅ User Sentences Data Types After Fix' as check_type,
  jsonb_typeof(user_sentences) as data_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
GROUP BY jsonb_typeof(user_sentences);

-- Check 2: Verify sentence counts
SELECT
  text,
  jsonb_typeof(user_sentences) as data_type,
  CASE
    WHEN jsonb_typeof(user_sentences) = 'array' THEN jsonb_array_length(user_sentences)
    ELSE NULL
  END as sentence_count,
  next_review_date,
  review_count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
ORDER BY text
LIMIT 10;

-- Check 3: Summary after fix
SELECT
  '📊 Summary After Fix' as summary_type,
  COUNT(*) as total_learned_words,
  SUM(CASE WHEN jsonb_typeof(user_sentences) = 'array' THEN 1 ELSE 0 END) as array_type_count,
  SUM(CASE WHEN jsonb_typeof(user_sentences) = 'string' THEN 1 ELSE 0 END) as string_type_count,
  SUM(CASE WHEN next_review_date IS NOT NULL THEN 1 ELSE 0 END) as has_review_date
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE;

-- =====================================================
-- Expected Results:
-- - Check 1: Should show "array" type with count = 25
-- - Check 2: Should show sentence_count = 3 for all words
-- - Check 3: array_type_count = 25, string_type_count = 0
-- =====================================================

-- =====================================================
-- INSTRUCTIONS:
-- =====================================================
-- 1. Copy this SQL and run it in Supabase SQL Editor
-- 2. The UPDATE will fix the data type issue
-- 3. The verification queries will confirm the fix worked
-- 4. Refresh your app to see "Review date" instead of "Added date"
-- =====================================================
