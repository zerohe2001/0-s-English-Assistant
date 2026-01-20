import { createClient } from '@supabase/supabase-js';

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
  level: string;
  target: string;
  native_language: string;
  saved_contexts: any[];
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
      level: profile.level,
      target: profile.target,
      native_language: profile.nativeLanguage,
      saved_contexts: profile.savedContexts || [],
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

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

  // Delete existing explanations
  const { error: deleteError } = await supabase
    .from('word_explanations')
    .delete()
    .eq('user_id', user.id);

  if (deleteError) return { error: deleteError };

  const entries = Object.entries(explanations);
  if (entries.length === 0) return { data: [], error: null };

  const { data, error } = await supabase
    .from('word_explanations')
    .insert(
      entries.map(([wordId, exp]: [string, any]) => ({
        user_id: user.id,
        word_id: wordId,
        definition: exp.definition,
        example: exp.example,
        example_translation: exp.exampleTranslation,
        tips: exp.tips,
      }))
    )
    .select();

  return { data, error };
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
    .upsert({
      user_id: user.id,
      input_tokens: tokenUsage.inputTokens,
      output_tokens: tokenUsage.outputTokens,
      total_cost: tokenUsage.totalCost,
      updated_at: new Date().toISOString(),
    })
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
