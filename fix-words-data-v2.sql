-- =====================================================
-- Fix Words Data Integrity Issues (Version 2)
-- User: lin.hecafa@gmail.com
-- User ID: 9fb717d0-3d44-44ef-bffb-307b1864712a
-- =====================================================
--
-- Problem: user_sentences stored as STRING instead of ARRAY
-- Root Cause: The data was double-encoded as JSON string
-- Solution: Parse the string as JSON to get the proper array
-- =====================================================

-- First, let's see what the data looks like
SELECT
  text,
  user_sentences,
  jsonb_typeof(user_sentences) as current_type,
  pg_typeof(user_sentences) as pg_type
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
LIMIT 3;

-- =====================================================
-- Fix Attempt 1: Direct cast to JSONB
-- =====================================================
-- This converts the string value to proper JSONB array

UPDATE words
SET
  user_sentences = (user_sentences #>> '{}')::jsonb,
  updated_at = NOW()
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
  AND jsonb_typeof(user_sentences) = 'string';

-- =====================================================
-- Verification Query
-- =====================================================

SELECT
  '✅ After Fix' as status,
  jsonb_typeof(user_sentences) as data_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
GROUP BY jsonb_typeof(user_sentences);

-- Check specific words
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
