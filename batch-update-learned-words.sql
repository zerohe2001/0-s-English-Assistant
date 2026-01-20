-- =====================================================
-- Batch Update Learned Words
-- Generated: 2026-01-20
-- Total words: 27
-- =====================================================

-- STEP 1: Get your user_id (replace your-email@example.com with your actual email)
-- Run this first to get your user_id:
-- SELECT id FROM auth.users WHERE email = 'your-email@example.com';

-- STEP 2: Replace YOUR_USER_ID_HERE below with the ID from step 1

-- Update word: controversy
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"controversy\" today.", "translation": "我今天学习了\"controversy\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"controversy\" is useful in conversations.", "translation": "\"controversy\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"controversy\" more often.", "translation": "我需要更多地练习使用\"controversy\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'controversy';

-- Update word: agenda
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"agenda\" today.", "translation": "我今天学习了\"agenda\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"agenda\" is useful in conversations.", "translation": "\"agenda\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"agenda\" more often.", "translation": "我需要更多地练习使用\"agenda\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'agenda';

-- Update word: quantitative
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"quantitative\" today.", "translation": "我今天学习了\"quantitative\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"quantitative\" is useful in conversations.", "translation": "\"quantitative\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"quantitative\" more often.", "translation": "我需要更多地练习使用\"quantitative\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'quantitative';

-- Update word: tilting
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"tilting\" today.", "translation": "我今天学习了\"tilting\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"tilting\" is useful in conversations.", "translation": "\"tilting\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"tilting\" more often.", "translation": "我需要更多地练习使用\"tilting\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'tilting';

-- Update word: ergonomic
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"ergonomic\" today.", "translation": "我今天学习了\"ergonomic\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"ergonomic\" is useful in conversations.", "translation": "\"ergonomic\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"ergonomic\" more often.", "translation": "我需要更多地练习使用\"ergonomic\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'ergonomic';

-- Update word: procedures
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"procedures\" today.", "translation": "我今天学习了\"procedures\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"procedures\" is useful in conversations.", "translation": "\"procedures\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"procedures\" more often.", "translation": "我需要更多地练习使用\"procedures\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'procedures';

-- Update word: perhaps
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"perhaps\" today.", "translation": "我今天学习了\"perhaps\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"perhaps\" is useful in conversations.", "translation": "\"perhaps\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"perhaps\" more often.", "translation": "我需要更多地练习使用\"perhaps\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'perhaps';

-- Update word: vent
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"vent\" today.", "translation": "我今天学习了\"vent\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"vent\" is useful in conversations.", "translation": "\"vent\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"vent\" more often.", "translation": "我需要更多地练习使用\"vent\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'vent';

-- Update word: occupational
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"occupational\" today.", "translation": "我今天学习了\"occupational\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"occupational\" is useful in conversations.", "translation": "\"occupational\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"occupational\" more often.", "translation": "我需要更多地练习使用\"occupational\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'occupational';

-- Update word: tension
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"tension\" today.", "translation": "我今天学习了\"tension\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"tension\" is useful in conversations.", "translation": "\"tension\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"tension\" more often.", "translation": "我需要更多地练习使用\"tension\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'tension';

-- Update word: incident
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"incident\" today.", "translation": "我今天学习了\"incident\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"incident\" is useful in conversations.", "translation": "\"incident\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"incident\" more often.", "translation": "我需要更多地练习使用\"incident\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'incident';

-- Update word: legislation
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"legislation\" today.", "translation": "我今天学习了\"legislation\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"legislation\" is useful in conversations.", "translation": "\"legislation\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"legislation\" more often.", "translation": "我需要更多地练习使用\"legislation\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'legislation';

-- Update word: symptoms
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"symptoms\" today.", "translation": "我今天学习了\"symptoms\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"symptoms\" is useful in conversations.", "translation": "\"symptoms\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"symptoms\" more often.", "translation": "我需要更多地练习使用\"symptoms\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'symptoms';

-- Update word: plural
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"plural\" today.", "translation": "我今天学习了\"plural\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"plural\" is useful in conversations.", "translation": "\"plural\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"plural\" more often.", "translation": "我需要更多地练习使用\"plural\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'plural';

-- Update word: penalty
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"penalty\" today.", "translation": "我今天学习了\"penalty\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"penalty\" is useful in conversations.", "translation": "\"penalty\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"penalty\" more often.", "translation": "我需要更多地练习使用\"penalty\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'penalty';

-- Update word: ample
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"ample\" today.", "translation": "我今天学习了\"ample\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"ample\" is useful in conversations.", "translation": "\"ample\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"ample\" more often.", "translation": "我需要更多地练习使用\"ample\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'ample';

-- Update word: calories
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"calories\" today.", "translation": "我今天学习了\"calories\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"calories\" is useful in conversations.", "translation": "\"calories\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"calories\" more often.", "translation": "我需要更多地练习使用\"calories\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'calories';

-- Update word: value
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"value\" today.", "translation": "我今天学习了\"value\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"value\" is useful in conversations.", "translation": "\"value\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"value\" more often.", "translation": "我需要更多地练习使用\"value\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'value';

-- Update word: containing
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"containing\" today.", "translation": "我今天学习了\"containing\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"containing\" is useful in conversations.", "translation": "\"containing\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"containing\" more often.", "translation": "我需要更多地练习使用\"containing\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'containing';

-- Update word: keen
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"keen\" today.", "translation": "我今天学习了\"keen\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"keen\" is useful in conversations.", "translation": "\"keen\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"keen\" more often.", "translation": "我需要更多地练习使用\"keen\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'keen';

-- Update word: workstation
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"workstation\" today.", "translation": "我今天学习了\"workstation\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"workstation\" is useful in conversations.", "translation": "\"workstation\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"workstation\" more often.", "translation": "我需要更多地练习使用\"workstation\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'workstation';

-- Update word: further
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"further\" today.", "translation": "我今天学习了\"further\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"further\" is useful in conversations.", "translation": "\"further\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"further\" more often.", "translation": "我需要更多地练习使用\"further\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'further';

-- Update word: crash
UPDATE words
SET
  learned = TRUE,
  user_sentences = '[
    {"sentence": "I learned the word \"crash\" today.", "translation": "我今天学习了\"crash\"这个词。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "The word \"crash\" is useful in conversations.", "translation": "\"crash\"这个词在对话中很有用。", "createdAt": "2026-01-20T00:00:00.000Z"},
    {"sentence": "I need to practice using \"crash\" more often.", "translation": "我需要更多地练习使用\"crash\"。", "createdAt": "2026-01-20T00:00:00.000Z"}
  ]'::jsonb,
  review_count = 1,
  next_review_date = (NOW() + INTERVAL '7 days'),
  review_stats = '{"retryCount": 0, "skipped": false}'::jsonb,
  updated_at = NOW()
WHERE
  user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text = 'crash';

-- =====================================================
-- Verification Query
-- =====================================================

SELECT
  text,
  learned,
  review_count,
  next_review_date,
  jsonb_array_length(user_sentences) as sentence_count
FROM words
WHERE user_id = 'YOUR_USER_ID_HERE'::uuid
  AND text IN ('controversy', 'agenda', 'quantitative', 'tilting', 'ergonomic', 'procedures', 'perhaps', 'vent', 'occupational', 'tension', 'incident', 'legislation', 'symptoms', 'plural', 'penalty', 'ample', 'calories', 'value', 'containing', 'keen', 'workstation', 'further', 'crash')
ORDER BY text;

-- Expected: All 23 words should have learned=true, sentence_count=3
