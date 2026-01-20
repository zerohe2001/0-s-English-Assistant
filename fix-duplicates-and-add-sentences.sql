-- =====================================================
-- Step 1: Remove Duplicate Words
-- =====================================================

-- First, see all duplicates
SELECT
  text,
  COUNT(*) as duplicate_count,
  array_agg(id) as all_ids
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
GROUP BY text
HAVING COUNT(*) > 1;

-- Delete duplicates, keep only the first one (by id)
DELETE FROM words
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY text ORDER BY id) as rn
    FROM words
    WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
      AND learned = TRUE
      AND deleted = FALSE
  ) t
  WHERE rn > 1
);

-- Verify no more duplicates
SELECT
  text,
  COUNT(*) as count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
GROUP BY text
HAVING COUNT(*) > 1;

-- =====================================================
-- Step 2: Add Placeholder Sentences to All Learned Words
-- =====================================================

-- Get list of all learned words without sentences
SELECT text
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (user_sentences = '[]'::jsonb OR user_sentences IS NULL)
ORDER BY text;

-- Update all learned words with placeholder sentences
UPDATE words
SET
  user_sentences = jsonb_build_array(
    jsonb_build_object(
      'sentence', 'I learned the word "' || text || '" today.',
      'translation', '我今天学习了"' || text || '"这个词。',
      'createdAt', NOW()
    ),
    jsonb_build_object(
      'sentence', 'The word "' || text || '" is useful in conversations.',
      'translation', '"' || text || '"这个词在对话中很有用。',
      'createdAt', NOW()
    ),
    jsonb_build_object(
      'sentence', 'I need to practice using "' || text || '" more often.',
      'translation', '我需要更多地练习使用"' || text || '"。',
      'createdAt', NOW()
    )
  ),
  updated_at = NOW()
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (user_sentences = '[]'::jsonb OR user_sentences IS NULL);

-- =====================================================
-- Verification
-- =====================================================

-- Check all learned words now have 3 sentences
SELECT
  text,
  jsonb_typeof(user_sentences) as json_type,
  jsonb_array_length(user_sentences) as sentence_count,
  next_review_date,
  review_count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
ORDER BY text;

-- Summary
SELECT
  COUNT(*) as total_learned_words,
  SUM(CASE WHEN jsonb_array_length(user_sentences) = 3 THEN 1 ELSE 0 END) as words_with_3_sentences,
  SUM(CASE WHEN next_review_date IS NOT NULL THEN 1 ELSE 0 END) as words_with_review_date
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE;
