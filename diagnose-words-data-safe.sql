-- =====================================================
-- Diagnostic Query for Words Data Integrity (SAFE VERSION)
-- User: lin.hecafa@gmail.com
-- User ID: 9fb717d0-3d44-44ef-bffb-307b1864712a
-- Purpose: Identify all data integrity issues before fixing
-- =====================================================

-- Check 1: Learned words missing next_review_date
SELECT
  '❌ Learned words missing next_review_date' as issue_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND next_review_date IS NULL;

-- Check 1 Details: List the words
SELECT
  text,
  learned,
  next_review_date,
  review_count,
  created_at,
  updated_at
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND next_review_date IS NULL
ORDER BY text;

-- Check 2: Learned words missing user_sentences
SELECT
  '❌ Learned words missing user_sentences' as issue_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (user_sentences IS NULL OR user_sentences = '[]'::jsonb);

-- Check 2 Details: List the words
SELECT
  text,
  learned,
  user_sentences,
  created_at
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (user_sentences IS NULL OR user_sentences = '[]'::jsonb)
ORDER BY text;

-- Check 3: Learned words with user_sentences that are arrays
SELECT
  '📋 Checking sentence counts for array-type user_sentences' as info
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
LIMIT 1;

-- Check 3 Details: List words with array sentences and their counts
SELECT
  text,
  learned,
  jsonb_typeof(user_sentences) as data_type,
  CASE WHEN jsonb_typeof(user_sentences) = 'array' THEN jsonb_array_length(user_sentences) ELSE NULL END as sentence_count,
  created_at
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
  AND user_sentences != '[]'::jsonb
ORDER BY text;

-- Check 4: Words missing phonetic data (all words)
SELECT
  '⚠️ Words missing phonetic' as issue_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND deleted = FALSE
  AND (phonetic IS NULL OR phonetic = '');

-- Check 5: Learned words with abnormal review_count
SELECT
  '⚠️ Learned words with abnormal review_count' as issue_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (review_count IS NULL OR review_count = 0);

-- Check 5 Details: List the words
SELECT
  text,
  learned,
  review_count,
  next_review_date,
  created_at
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (review_count IS NULL OR review_count = 0)
ORDER BY text;

-- Check 6: Learned words missing review_stats
SELECT
  '⚠️ Learned words missing review_stats' as issue_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND review_stats IS NULL;

-- Check 6 Details: List the words
SELECT
  text,
  learned,
  review_stats,
  review_count,
  next_review_date
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND review_stats IS NULL
ORDER BY text;

-- =====================================================
-- SUMMARY STATISTICS (SAFE VERSION)
-- =====================================================

SELECT
  '📊 Overall Statistics' as summary_type,
  COUNT(*) as total_words,
  SUM(CASE WHEN learned = TRUE THEN 1 ELSE 0 END) as learned_words,
  SUM(CASE WHEN learned = FALSE THEN 1 ELSE 0 END) as unlearned_words,
  SUM(CASE WHEN deleted = TRUE THEN 1 ELSE 0 END) as deleted_words
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid;

SELECT
  '📊 Learned Words Basic Completeness' as summary_type,
  COUNT(*) as total_learned_words,
  SUM(CASE WHEN next_review_date IS NOT NULL THEN 1 ELSE 0 END) as has_review_date,
  SUM(CASE WHEN user_sentences IS NOT NULL AND user_sentences != '[]'::jsonb THEN 1 ELSE 0 END) as has_sentences,
  SUM(CASE WHEN review_count IS NOT NULL AND review_count > 0 THEN 1 ELSE 0 END) as has_review_count,
  SUM(CASE WHEN review_stats IS NOT NULL THEN 1 ELSE 0 END) as has_review_stats,
  SUM(CASE WHEN phonetic IS NOT NULL AND phonetic != '' THEN 1 ELSE 0 END) as has_phonetic
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE;

-- Check data types
SELECT
  '📊 User Sentences Data Types' as summary_type,
  jsonb_typeof(user_sentences) as data_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
GROUP BY jsonb_typeof(user_sentences);

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
-- 1. Run this entire script in Supabase SQL Editor
-- 2. Review all the counts and details
-- 3. Share the results with Claude to generate fix SQL
-- 4. This version avoids jsonb_array_length errors by checking types first
-- =====================================================
