import { createClient } from '@supabase/supabase-js';

let wordExplanationsSyncInFlight = false;

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase configuration missing. Data sync will not work.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Database types
export interface DbUserProfile {
  id: string;
  user_id: string;
  name: string;
  city: string; // ✅ NEW: User's city
  occupation: string; // ✅ NEW: User's occupation
  hobbies: string; // ✅ NEW: User's hobbies/interests
  frequent_places: string; // ✅ NEW: Places user frequently visits
  level: string; // ⚠️ DEPRECATED: kept for backward compatibility
  target: string; // ⚠️ DEPRECATED: kept for backward compatibility
  native_language: string; // ⚠️ DEPRECATED: kept for backward compatibility
  saved_contexts: any[];
  check_in_history: any[]; // ✅ Daily check-in records (CheckInRecord[])
  created_at: string;
  updated_at: string;
}

export interface DbWord {
  id: string;
  user_id: string;
  text: string;
  phonetic: string | null; // ✅ American English pronunciation
  added_at: string; // ✅ When word was first added
  learned: boolean;
  user_sentence: string | null; // ⚠️ LEGACY: kept for backward compatibility
  user_sentence_translation: string | null; // ⚠️ LEGACY: kept for backward compatibility
  user_sentences: string | null; // ✅ NEW: JSON string of UserSentence[]
  review_stats: any | null;
  next_review_date: string | null;
  review_count: number; // ✅ Number of successful reviews
  deleted: boolean; // ✅ Soft delete flag
  deleted_at: string | null; // ✅ When the word was deleted
  created_at: string;
  updated_at: string;
}

export interface DbWordExplanation {
  id: string;
  user_id: string;
  word_id: string;
  definition: string;
  example: string;
  example_translation: string;
  tips: string;
  created_at: string;
}

export interface DbTokenUsage {
  id: string;
  user_id: string;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  updated_at: string;
}

export interface DbReadingArticle {
  id: string;
  user_id: string;
  title: string;
  content: string;
  sentences: string; // JSONB stored as string
  created_at: string;
  last_played_at: string | null;
  audio_status: string;
  audio_blob_key: string | null;
  audio_duration: number | null;
  sentence_times: string | null; // JSONB stored as string
  updated_at: string;
}

// Helper functions for auth
export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

// Helper functions for data sync
export const syncProfile = async (profile: any) => {
  const user = await getCurrentUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      user_id: user.id,
      name: profile.name,
      city: profile.city || '', // ✅ NEW
      occupation: profile.occupation || '', // ✅ NEW
      hobbies: profile.hobbies || '', // ✅ NEW
      frequent_places: profile.frequentPlaces || '', // ✅ NEW
      level: profile.level || '', // ⚠️ DEPRECATED: kept for compatibility
      target: profile.target || '', // ⚠️ DEPRECATED: kept for compatibility
      native_language: profile.nativeLanguage || 'zh-CN', // ⚠️ DEPRECATED: kept for compatibility
      saved_contexts: profile.savedContexts || [],
      check_in_history: profile.checkInHistory || [], // ✅ Sync check-in history
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id', // ✅ Update existing record when user_id conflicts
      ignoreDuplicates: false
    })
    .select()
    .single();

  if (data) {
    console.log('✅ syncProfile: Profile synced to cloud');
  }
  if (error) {
    console.error('❌ syncProfile error:', error);
  }

  return { data, error };
};

export const fetchProfile = async () => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return { data, error };
};

export const syncWords = async (words: any[]) => {
  const user = await getCurrentUser();
  if (!user) return { error: new Error('Not authenticated') };

  // ✅ Safety check: If local has no words, don't delete cloud data!
  // This prevents data loss when localStorage is cleared
  if (words.length === 0) {
    console.warn('⚠️ syncWords: Local storage is empty, skipping sync to prevent cloud data loss');
    return { data: [], error: null };
  }

  // ✅ Use UPSERT instead of DELETE + INSERT
  // This is much safer - it updates existing records or inserts new ones
  // No risk of deleting all data if something goes wrong
  const { data, error } = await supabase
    .from('words')
    .upsert(
      words.map(w => ({
        user_id: user.id,
        id: w.id,
        text: w.text,
        phonetic: w.phonetic || null, // ✅ NEW: pronunciation
        added_at: w.addedAt || new Date().toISOString(), // ✅ NEW: when word was added
        learned: w.learned || false,
        user_sentences: w.userSentences ? JSON.stringify(w.userSentences) : null, // ✅ Store as JSON array
        review_stats: w.reviewStats || null,
        next_review_date: w.nextReviewDate || null,
        review_count: w.reviewCount || 0, // ✅ Track review count for Ebbinghaus intervals
        deleted: w.deleted || false, // ✅ NEW: soft delete flag
        deleted_at: w.deletedAt || null, // ✅ NEW: when word was deleted
      })),
      {
        onConflict: 'id', // ✅ If word with same ID exists, update it
        ignoreDuplicates: false // ✅ Always update existing records
      }
    )
    .select();

  if (data) {
    console.log(`✅ syncWords: Successfully synced ${data.length} words to cloud`);
  }

  return { data, error };
};

export const fetchWords = async () => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  // ✅ Fetch ALL words including deleted ones
  // Filtering is done in the frontend using getActiveWords()
  // This allows for future "Trash" feature to restore deleted words
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .eq('user_id', user.id)
    .order('added_at', { ascending: true }); // ✅ Use added_at instead of created_at

  if (data) {
    console.log(`✅ fetchWords: Loaded ${data.length} words from cloud (${data.filter((w: any) => !w.deleted).length} active)`);
  }

  return { data, error };
};

export const syncWordExplanations = async (explanations: Record<string, any>) => {
  const user = await getCurrentUser();
  if (!user) return { error: new Error('Not authenticated') };

  if (wordExplanationsSyncInFlight) {
    return { data: [], error: null };
  }

  wordExplanationsSyncInFlight = true;

  const entries = Object.entries(explanations);
  if (entries.length === 0) return { data: [], error: null };

  const validEntries = entries.filter(([, exp]) => {
    const definition = exp?.meaning ?? exp?.definition;
    return definition && String(definition).trim().length > 0;
  });

  if (validEntries.length === 0) {
    console.warn('⚠️ syncWordExplanations: No valid entries to sync');
    return { data: [], error: null };
  }

  if (validEntries.length < entries.length) {
    console.warn(`⚠️ syncWordExplanations: Skipping ${entries.length - validEntries.length} invalid entries`);
  }

  try {
    const { data, error } = await supabase
      .from('word_explanations')
      .upsert(
        validEntries.map(([wordId, exp]: [string, any]) => ({
          user_id: user.id,
          word_id: wordId,
          definition: exp.meaning || exp.definition || '', // ✅ Frontend uses 'meaning', fallback to 'definition'
          example: exp.example || '',
          example_translation: exp.exampleTranslation || '',
          tips: exp.tips || exp.phonetic || '', // ✅ Fallback to 'phonetic' if 'tips' not present
        })),
        {
          onConflict: 'user_id,word_id',
          ignoreDuplicates: false
        }
      )
      .select();

    return { data, error };
  } finally {
    wordExplanationsSyncInFlight = false;
  }
};

export const fetchWordExplanations = async () => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('word_explanations')
    .select('*')
    .eq('user_id', user.id);

  return { data, error };
};

export const syncTokenUsage = async (tokenUsage: any) => {
  const user = await getCurrentUser();
  if (!user) return { error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('token_usage')
    .upsert(
      {
        user_id: user.id,
        input_tokens: tokenUsage.inputTokens,
        output_tokens: tokenUsage.outputTokens,
        total_cost: tokenUsage.totalCost,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id',
        ignoreDuplicates: false
      }
    )
    .select()
    .single();

  return { data, error };
};

export const fetchTokenUsage = async () => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('token_usage')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return { data, error };
};

export const syncReadingArticles = async (articles: any[]) => {
  const user = await getCurrentUser();
  if (!user) return { error: new Error('Not authenticated') };

  // ✅ Safety check: If local has no articles, don't attempt sync
  if (articles.length === 0) {
    console.warn('⚠️ syncReadingArticles: No articles to sync');
    return { data: [], error: null };
  }

  // ✅ Use UPSERT for safe syncing
  const { data, error } = await supabase
    .from('reading_articles')
    .upsert(
      articles.map(a => ({
        user_id: user.id,
        id: a.id,
        title: a.title,
        content: a.content,
        sentences: JSON.stringify(a.sentences), // JSONB field
        created_at: new Date(a.createdAt).toISOString(),
        last_played_at: a.lastPlayedAt ? new Date(a.lastPlayedAt).toISOString() : null,
        audio_status: a.audioStatus,
        audio_blob_key: a.audioBlobKey || null,
        audio_duration: a.audioDuration || null,
        sentence_times: a.sentenceTimes ? JSON.stringify(a.sentenceTimes) : null, // JSONB field
      })),
      {
        onConflict: 'id',
        ignoreDuplicates: false
      }
    )
    .select();

  if (data) {
    console.log(`✅ syncReadingArticles: Successfully synced ${data.length} articles to cloud`);
  }
  if (error) {
    console.error('❌ syncReadingArticles error:', error);
  }

  return { data, error };
};

export const fetchReadingArticles = async () => {
  const user = await getCurrentUser();
  if (!user) return { data: null, error: new Error('Not authenticated') };

  const { data, error } = await supabase
    .from('reading_articles')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false }); // Most recent first

  if (data) {
    console.log(`✅ fetchReadingArticles: Loaded ${data.length} articles from cloud`);
  }
  if (error) {
    console.error('❌ fetchReadingArticles error:', error);
  }

  return { data, error };
};
