-- =====================================================
-- Verification Query for Learned Words
-- User: lin.hecafa@gmail.com
-- User ID: 9fb717d0-3d44-44ef-bffb-307b1864712a
-- =====================================================

-- Check 1: Count learned words
SELECT
  COUNT(*) as total_learned_words
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE;
-- Expected: Should be 23 or more

-- Check 2: Verify all target words are marked as learned
SELECT
  text,
  learned,
  review_count,
  next_review_date,
  jsonb_array_length(user_sentences) as sentence_count,
  updated_at
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND text IN (
    'controversy', 'agenda', 'quantitative', 'tilting', 'ergonomic',
    'procedures', 'perhaps', 'vent', 'occupational', 'tension',
    'incident', 'legislation', 'symptoms', 'plural', 'penalty',
    'ample', 'calories', 'value', 'containing', 'keen',
    'workstation', 'further', 'crash'
  )
ORDER BY text;
-- Expected: All 23 words with learned=true, sentence_count=3

-- Check 3: See one example word's sentences
SELECT
  text,
  user_sentences
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND text = 'controversy'
LIMIT 1;
-- Expected: Should show 3 sentences in JSON format

-- Check 4: Summary statistics
SELECT
  COUNT(*) as total_words,
  SUM(CASE WHEN learned = TRUE THEN 1 ELSE 0 END) as learned_count,
  SUM(CASE WHEN learned = FALSE THEN 1 ELSE 0 END) as unlearned_count,
  SUM(CASE WHEN deleted = TRUE THEN 1 ELSE 0 END) as deleted_count,
  SUM(CASE WHEN user_sentences IS NOT NULL THEN 1 ELSE 0 END) as words_with_sentences
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid;
-- Shows overall statistics

-- Check 5: Check review dates
SELECT
  COUNT(*) as words_with_review_date
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND next_review_date IS NOT NULL;
-- Expected: Should match learned_count from Check 4
