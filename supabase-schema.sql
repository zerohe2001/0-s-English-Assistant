-- ActiveVocab Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  city TEXT, -- ✅ NEW: User's city
  occupation TEXT, -- ✅ NEW: User's occupation
  hobbies TEXT, -- ✅ NEW: User's hobbies/interests
  frequent_places TEXT, -- ✅ NEW: Places user frequently visits
  level TEXT, -- ⚠️ DEPRECATED: kept for backward compatibility
  target TEXT, -- ⚠️ DEPRECATED: kept for backward compatibility
  native_language TEXT DEFAULT 'zh-CN', -- ⚠️ DEPRECATED: kept for backward compatibility
  saved_contexts JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Words Table
CREATE TABLE IF NOT EXISTS words (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  phonetic TEXT, -- ✅ American English pronunciation (e.g., /ˈtɪltɪŋ/)
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(), -- ✅ When word was first added
  learned BOOLEAN DEFAULT FALSE,
  user_sentence TEXT, -- ⚠️ LEGACY: kept for backward compatibility
  user_sentence_translation TEXT, -- ⚠️ LEGACY: kept for backward compatibility
  user_sentences JSONB, -- ✅ NEW: Array of user-created sentences with translations
  review_stats JSONB,
  next_review_date TIMESTAMP WITH TIME ZONE,
  review_count INTEGER DEFAULT 0, -- ✅ Number of successful reviews (Ebbinghaus intervals)
  deleted BOOLEAN DEFAULT FALSE, -- ✅ Soft delete flag
  deleted_at TIMESTAMP WITH TIME ZONE, -- ✅ When the word was deleted
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Word Explanations Table (cached AI-generated content)
CREATE TABLE IF NOT EXISTS word_explanations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  word_id TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT NOT NULL,
  example_translation TEXT NOT NULL,
  tips TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, word_id)
);

-- Token Usage Table
CREATE TABLE IF NOT EXISTS token_usage (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  input_tokens BIGINT DEFAULT 0,
  output_tokens BIGINT DEFAULT 0,
  total_cost NUMERIC(10, 6) DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Reading Articles Table
CREATE TABLE IF NOT EXISTS reading_articles (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sentences JSONB NOT NULL, -- Array of sentence strings
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_played_at TIMESTAMP WITH TIME ZONE,
  audio_status TEXT NOT NULL DEFAULT 'pending',
  audio_blob_key TEXT, -- IndexedDB key for audio blob
  audio_duration NUMERIC, -- Duration in seconds
  sentence_times JSONB, -- Array of {start: number, end: number} objects
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_words_user_id ON words(user_id);
CREATE INDEX IF NOT EXISTS idx_words_learned ON words(user_id, learned);
CREATE INDEX IF NOT EXISTS idx_words_deleted ON words(user_id, deleted); -- ✅ For filtering deleted words
CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(user_id, next_review_date) WHERE deleted = FALSE; -- ✅ For review scheduling
CREATE INDEX IF NOT EXISTS idx_word_explanations_user_id ON word_explanations(user_id);
CREATE INDEX IF NOT EXISTS idx_token_usage_user_id ON token_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_articles_user_id ON reading_articles(user_id);
CREATE INDEX IF NOT EXISTS idx_reading_articles_created_at ON reading_articles(user_id, created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_articles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for words
CREATE POLICY "Users can view own words"
  ON words FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own words"
  ON words FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own words"
  ON words FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own words"
  ON words FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for word_explanations
CREATE POLICY "Users can view own explanations"
  ON word_explanations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own explanations"
  ON word_explanations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own explanations"
  ON word_explanations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own explanations"
  ON word_explanations FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for token_usage
CREATE POLICY "Users can view own token usage"
  ON token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token usage"
  ON token_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own token usage"
  ON token_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for reading_articles
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

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_words_updated_at
  BEFORE UPDATE ON words
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_token_usage_updated_at
  BEFORE UPDATE ON token_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reading_articles_updated_at
  BEFORE UPDATE ON reading_articles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
