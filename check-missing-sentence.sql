-- Find the word without sentences
SELECT
  text,
  user_sentences,
  jsonb_typeof(user_sentences) as json_type,
  CASE
    WHEN jsonb_typeof(user_sentences) = 'array' THEN jsonb_array_length(user_sentences)
    ELSE 0
  END as sentence_count,
  next_review_date,
  review_count
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND (user_sentences IS NULL
       OR user_sentences = '[]'::jsonb
       OR (jsonb_typeof(user_sentences) = 'array' AND jsonb_array_length(user_sentences) < 3))
ORDER BY text;
