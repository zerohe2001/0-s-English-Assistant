-- =====================================================
-- Reading Articles Table Migration - 2026-01-20
-- Purpose: Add reading_articles table for cloud sync
-- =====================================================

-- STEP 1: Create reading_articles table
CREATE TABLE IF NOT EXISTS reading_articles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sentences JSONB NOT NULL, -- Array of sentence strings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_played_at TIMESTAMP WITH TIME ZONE,

  -- Audio related
  audio_status TEXT NOT NULL DEFAULT 'pending',
  audio_blob_key TEXT, -- IndexedDB key for audio blob
  audio_duration NUMERIC, -- Duration in seconds

  -- Sentence timeline
  sentence_times JSONB, -- Array of {start: number, end: number} objects

  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- STEP 2: Enable Row Level Security
ALTER TABLE reading_articles ENABLE ROW LEVEL SECURITY;

-- STEP 3: Create RLS Policies
CREATE POLICY "Users can view own articles"
  ON reading_articles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own articles"
  ON reading_articles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own articles"
  ON reading_articles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own articles"
  ON reading_articles FOR DELETE
  USING (auth.uid() = user_id);

-- STEP 4: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reading_articles_user_id
  ON reading_articles(user_id);

CREATE INDEX IF NOT EXISTS idx_reading_articles_created_at
  ON reading_articles(user_id, created_at DESC);

-- STEP 5: Create trigger for updated_at
CREATE TRIGGER update_reading_articles_updated_at
  BEFORE UPDATE ON reading_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- STEP 6: Verification
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reading_articles'
ORDER BY ordinal_position;

-- Expected: 11 columns (id, user_id, title, content, sentences, created_at, last_played_at,
--                        audio_status, audio_blob_key, audio_duration, sentence_times, updated_at)

-- Success message
SELECT '✅ Reading articles table created successfully!' as status;
