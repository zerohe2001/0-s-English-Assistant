-- =====================================================
-- Debug: Check current state of user_sentences
-- =====================================================

-- Check 1: See the actual data
SELECT
  text,
  user_sentences,
  jsonb_typeof(user_sentences) as json_type,
  LENGTH(user_sentences::text) as data_length
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND text IN ('controversy', 'agenda', 'tilting')
ORDER BY text;

-- Check 2: Count by type
SELECT
  jsonb_typeof(user_sentences) as data_type,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
GROUP BY jsonb_typeof(user_sentences);
