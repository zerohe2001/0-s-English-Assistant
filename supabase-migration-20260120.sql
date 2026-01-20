-- =====================================================
-- ActiveVocab Database Migration - 2026-01-20
-- Purpose: Add missing fields for complete cloud sync
-- =====================================================

-- STEP 1: Backup existing data (IMPORTANT!)
-- Run this first to create a safety backup
CREATE TABLE IF NOT EXISTS words_backup_20260120 AS
SELECT * FROM words;

-- Verify backup was created
SELECT COUNT(*) as backup_count FROM words_backup_20260120;

-- =====================================================
-- STEP 2: Add missing columns to words table
-- =====================================================

-- Add phonetic field (American English pronunciation)
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS phonetic TEXT;

-- Add added_at timestamp (when word was first added)
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing rows to use created_at as added_at
UPDATE words
SET added_at = created_at
WHERE added_at IS NULL;

-- Add user_sentences field (replaces legacy single sentence fields)
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS user_sentences JSONB;

-- Migrate legacy single sentence to new array format
UPDATE words
SET user_sentences = jsonb_build_array(
  jsonb_build_object(
    'sentence', user_sentence,
    'translation', user_sentence_translation,
    'createdAt', created_at
  )
)
WHERE user_sentence IS NOT NULL
  AND user_sentence_translation IS NOT NULL
  AND user_sentences IS NULL;

-- Add review_count field (for Ebbinghaus spaced repetition)
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- Add soft delete fields
ALTER TABLE words
  ADD COLUMN IF NOT EXISTS deleted BOOLEAN DEFAULT FALSE;

ALTER TABLE words
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- =====================================================
-- STEP 3: Create indexes for better performance
-- =====================================================

-- Index for filtering deleted words (used in getActiveWords)
CREATE INDEX IF NOT EXISTS idx_words_deleted
  ON words(user_id, deleted);

-- Index for finding words due for review
CREATE INDEX IF NOT EXISTS idx_words_next_review
  ON words(user_id, next_review_date)
  WHERE deleted = FALSE;

-- Index for phonetic search (future feature)
CREATE INDEX IF NOT EXISTS idx_words_phonetic
  ON words(phonetic)
  WHERE phonetic IS NOT NULL;

-- =====================================================
-- STEP 4: Verification queries
-- =====================================================

-- Verify all new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'words'
  AND column_name IN ('phonetic', 'added_at', 'user_sentences', 'review_count', 'deleted', 'deleted_at')
ORDER BY column_name;

-- Expected result: 6 rows showing all new fields

-- Check data migration for user_sentences
SELECT
  id,
  text,
  user_sentence IS NOT NULL as had_old_sentence,
  user_sentences IS NOT NULL as has_new_sentences,
  user_sentences
FROM words
WHERE user_sentence IS NOT NULL
LIMIT 5;

-- Count statistics
SELECT
  COUNT(*) as total_words,
  COUNT(CASE WHEN deleted = TRUE THEN 1 END) as deleted_count,
  COUNT(CASE WHEN user_sentences IS NOT NULL THEN 1 END) as words_with_sentences,
  COUNT(CASE WHEN phonetic IS NOT NULL THEN 1 END) as words_with_phonetic
FROM words;

-- =====================================================
-- STEP 5: Optional - Clean up legacy columns (NOT RECOMMENDED YET)
-- =====================================================
-- DON'T RUN THIS YET! Keep legacy columns for safety
-- After confirming everything works for 1 week, you can uncomment:

-- ALTER TABLE words DROP COLUMN IF EXISTS user_sentence;
-- ALTER TABLE words DROP COLUMN IF EXISTS user_sentence_translation;

-- =====================================================
-- ROLLBACK PLAN (if something goes wrong)
-- =====================================================
-- If you need to restore data:
/*
-- 1. Clear corrupted data
DELETE FROM words WHERE user_id = 'YOUR_USER_ID_HERE';

-- 2. Restore from backup
INSERT INTO words
SELECT * FROM words_backup_20260120
WHERE user_id = 'YOUR_USER_ID_HERE';

-- 3. Verify restoration
SELECT COUNT(*) FROM words WHERE user_id = 'YOUR_USER_ID_HERE';
*/

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- Final success message
SELECT '✅ Migration completed successfully! Check verification results above.' as status;
