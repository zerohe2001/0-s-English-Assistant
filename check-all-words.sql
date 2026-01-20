-- Check all learned words with their user_sentences
SELECT
  text,
  user_sentences,
  jsonb_typeof(user_sentences) as json_type,
  LENGTH(user_sentences::text) as data_length
FROM words
WHERE user_id = '9fb717d0-3d44-44ef-bffb-307b1864712a'::uuid
  AND learned = TRUE
  AND deleted = FALSE
  AND user_sentences IS NOT NULL
ORDER BY text
LIMIT 5;
