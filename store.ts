
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Word, LearnState, DictionaryState, SavedContext, TokenUsage, ReadingArticle, ReadingState, ConversationMessage } from './types';
import { fetchWordDefinition } from './services/dictionary';
import { supabase, getCurrentUser, syncProfile, syncWords, syncWordExplanations, syncTokenUsage, syncReadingArticles, fetchProfile, fetchWords, fetchWordExplanations, fetchTokenUsage, fetchReadingArticles } from './services/supabase';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

const safeJsonParse = <T,>(value: string | null | undefined, fallback: T, label: string): T => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`Failed to parse ${label}:`, error);
    return fallback;
  }
};

const isNoRowsError = (error: any) => {
  return error?.code === 'PGRST116' || /0 rows/i.test(error?.message || '');
};

interface AppState {
  // Authentication & Sync
  user: any | null;
  isAuthenticated: boolean;
  isSyncing: boolean;
  checkAuth: () => Promise<void>;
  loadDataFromCloud: () => Promise<void>;
  syncDataToCloud: () => Promise<void>;
  logout: () => Promise<void>;

  // Toast Notifications
  toasts: ToastMessage[];
  showToast: (message: string, type: ToastType) => void;
  hideToast: (id: string) => void;

  // User Profile
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
  addSavedContext: (text: string) => void;
  removeSavedContext: (id: string) => void;
  isProfileSet: boolean;

  // Check-in System
  addCheckIn: (date: string, groupsCompleted: number, wordIds: string[]) => void;
  getCheckInRecord: (date: string) => import('./types').CheckInRecord | undefined;
  getTotalCheckInDays: () => number;
  getRecentCheckIns: (days: number) => import('./types').CheckInRecord[];
  getMakeupEligibleDates: () => string[];
  makeupCheckIn: (targetDate: string) => boolean;

  // Token Usage Tracking
  tokenUsage: TokenUsage;
  addTokenUsage: (inputTokens: number, outputTokens: number) => void;
  resetTokenUsage: () => void;

  // Vocabulary
  words: Word[];
  getActiveWords: () => Word[]; // ✅ Get all non-deleted words
  getDeletedWords: () => Word[]; // ✅ Get all deleted words
  restoreWord: (id: string) => void; // ✅ Restore a deleted word
  permanentlyDeleteWord: (id: string) => void; // ✅ Permanently delete a word
  addWord: (text: string) => Promise<{ duplicate: boolean; existingWord?: Word }>;
  removeWord: (id: string) => void;
  bulkAddWords: (text: string) => Promise<{ duplicates: Array<{ word: string; existingWord: Word }>; newWords: string[]; totalProcessed: number }>;
  bulkAddWordsForce: (words: string[]) => Promise<void>; // ✅ Force add words (even duplicates)
  markWordAsLearned: (wordId: string) => void; // ✅ Mark word as learned
  addUserSentence: (wordId: string, sentence: string, translation: string) => void; // ✅ Add a sentence to Word's userSentences array
  updateReviewStats: (wordId: string, stats: import('./types').ReviewStats) => void; // ✅ Update review stats

  // Learning Session
  learnState: LearnState;
  setDailyContext: (context: string) => void;
  startLearning: () => void;
  startLearningWithWords: (wordIds: string[]) => void; // ✅ Start learning with specific words
  setWordSubStep: (step: LearnState['wordSubStep']) => void;
  nextSentence: () => void; // ✅ Move to next sentence in creation phase (0->1->2)
  nextWord: () => void;
  goBackStep: () => void; // ✅ Go back to previous step in learning flow
  startReviewPhase: () => void; // ✅ Start review phase
  setReviewSubStep: (step: import('./types').ReviewStep) => void; // ✅ Set review substep
  setReviewAttempt: (attempt: string) => void; // ✅ Store current review attempt
  nextReviewSentence: () => void; // ✅ Move to next sentence in review (0->1->2)
  nextReviewWord: (completed: boolean) => void; // ✅ Move to next word in review
  resetSession: () => void;
  setWordExplanation: (wordId: string, explanation: import('./types').WordExplanation) => void; // ✅ Store explanation
  saveUserSentence: (wordId: string, sentence: string) => void; // ✅ Save user's created sentence

  // Standalone Review Session
  reviewState: import('./types').ReviewState;
  startReviewSession: (words: Word[]) => void;
  setReviewStep: (step: 'speaking' | 'comparing') => void;
  setReviewInput: (input: string) => void;
  setReviewComparison: (result: { similarity: number; feedback: string; differences: string[] }) => void;
  nextReviewSentenceStandalone: () => void;
  nextReviewWordStandalone: (stats: import('./types').ReviewStats) => void;
  goBackReview: () => void;
  exitReviewSession: () => void;

  // Dictionary
  dictionary: DictionaryState;
  openDictionary: (word: string) => Promise<void>;
  closeDictionary: () => void;

  // Reading
  readingState: ReadingState;
  addArticle: (title: string, content: string) => void;
  removeArticle: (id: string) => void;
  setCurrentArticle: (id: string | null) => void;
  updateArticleAudioStatus: (id: string, status: ReadingArticle['audioStatus'], audioBlobKey?: string, audioDuration?: number) => void;
  setPlaybackState: (isPlaying: boolean, currentTime?: number, currentSentenceIndex?: number) => void;
  setPlaybackRate: (rate: number) => void;
  updateLastPlayed: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Authentication & Sync
      user: null,
      isAuthenticated: false,
      isSyncing: false,

      checkAuth: async () => {
        const user = await getCurrentUser();
        set({ user, isAuthenticated: !!user });

        if (user) {
          // Load data from cloud on auth check
          await get().loadDataFromCloud();

          // ✅ Don't auto-sync after login - cloud data is the source of truth
          // User actions (like adding words, learning) will trigger sync as needed
        }
      },

      loadDataFromCloud: async () => {
        try {
          set({ isSyncing: true });
          const { showToast } = get();
          const loadErrors: string[] = [];

          // Fetch all data in parallel
          const results = await Promise.allSettled([
            fetchProfile(),
            fetchWords(),
            fetchWordExplanations(),
            fetchTokenUsage(),
            fetchReadingArticles()
          ]);
          const [profileResult, wordsResult, explanationsResult, tokenResult, articlesResult] = results;

          const getResult = <T,>(result: PromiseSettledResult<T>, label: string): T | null => {
            if (result.status === 'fulfilled') {
              return result.value;
            }
            console.error(`❌ Failed to load ${label}:`, result.reason);
            loadErrors.push(label);
            return null;
          };

          const profileData = getResult(profileResult, 'profile');
          const wordsData = getResult(wordsResult, 'words');
          const explanationsData = getResult(explanationsResult, 'word explanations');
          const tokenData = getResult(tokenResult, 'token usage');
          const articlesData = getResult(articlesResult, 'reading articles');

          const trackDataError = (result: { error?: any } | null, label: string, ignoreNoRows = false) => {
            if (result?.error) {
              if (ignoreNoRows && isNoRowsError(result.error)) {
                return;
              }
              console.error(`❌ ${label} error:`, result.error);
              loadErrors.push(label);
            }
          };

          trackDataError(profileData, 'profile', true);
          trackDataError(wordsData, 'words');
          trackDataError(explanationsData, 'word explanations');
          trackDataError(tokenData, 'token usage');
          trackDataError(articlesData, 'reading articles');

          // Update profile
          if (profileData.data) {
            const p = profileData.data;
            set({
              profile: {
                name: p.name,
                city: p.city || '', // ✅ NEW
                occupation: p.occupation || '', // ✅ NEW
                hobbies: p.hobbies || '', // ✅ NEW
                frequentPlaces: p.frequent_places || '', // ✅ NEW
                level: p.level || '', // ⚠️ DEPRECATED
                target: p.target || '', // ⚠️ DEPRECATED
                nativeLanguage: p.native_language || 'zh-CN', // ⚠️ DEPRECATED
                savedContexts: p.saved_contexts || [],
                checkInHistory: p.check_in_history || [] // ✅ Load check-in history
              },
              isProfileSet: true
            });
          }

          // Update words
          if (wordsData.data && wordsData.data.length > 0) {
            set({
              words: wordsData.data.map((w: any) => {
                // Parse userSentences from JSON string or create from legacy fields
                let userSentences: import('./types').UserSentence[] = [];

                if (w.user_sentences) {
                  // New format: JSON array of sentences
                  try {
                    userSentences = JSON.parse(w.user_sentences);
                  } catch (e) {
                    console.error('Failed to parse user_sentences:', e);
                  }
                } else if (w.user_sentence && w.user_sentence_translation) {
                  // Legacy format: single sentence - convert to array
                  userSentences = [{
                    sentence: w.user_sentence,
                    translation: w.user_sentence_translation,
                    createdAt: w.added_at || w.created_at || new Date().toISOString()
                  }];
                }

                return {
                  id: w.id,
                  text: w.text,
                  phonetic: w.phonetic || undefined, // ✅ NEW: pronunciation
                  addedAt: w.added_at || w.created_at, // ✅ NEW: when word was added
                  learned: w.learned,
                  userSentences,
                  reviewStats: w.review_stats,
                  nextReviewDate: w.next_review_date,
                  reviewCount: w.review_count || 0,
                  deleted: w.deleted || false, // ✅ NEW: soft delete flag
                  deletedAt: w.deleted_at || undefined, // ✅ NEW: when word was deleted
                };
              })
            });
          }

          // Update word explanations
          if (explanationsData.data && explanationsData.data.length > 0) {
            const explanations: Record<string, any> = {};
            explanationsData.data.forEach((exp: any) => {
              explanations[exp.word_id] = {
                definition: exp.definition,
                example: exp.example,
                exampleTranslation: exp.example_translation,
                tips: exp.tips
              };
            });
            set((state) => ({
              learnState: {
                ...state.learnState,
                wordExplanations: explanations
              }
            }));
          }

          // Update token usage
          if (tokenData.data) {
            set({
              tokenUsage: {
                inputTokens: tokenData.data.input_tokens,
                outputTokens: tokenData.data.output_tokens,
                totalCost: tokenData.data.total_cost
              }
            });
          }

          // Update reading articles
          if (articlesData.data && articlesData.data.length > 0) {
            set({
              readingState: {
                ...get().readingState,
                articles: articlesData.data.map((a: any) => ({
                  id: a.id,
                  title: a.title,
                  content: a.content,
                  sentences: safeJsonParse(a.sentences, [], 'reading article sentences'), // Parse JSONB safely
                  createdAt: new Date(a.created_at).getTime(),
                  lastPlayedAt: a.last_played_at ? new Date(a.last_played_at).getTime() : undefined,
                  audioStatus: a.audio_status,
                  audioBlobKey: a.audio_blob_key || undefined,
                  audioDuration: a.audio_duration || undefined,
                  sentenceTimes: safeJsonParse(a.sentence_times, undefined, 'reading article sentence_times'), // Parse JSONB safely
                }))
              }
            });
          }

          console.log('✅ Data loaded from cloud');
          if (loadErrors.length > 0) {
            showToast('部分数据加载失败，可稍后重试', 'warning');
          }
        } catch (error) {
          console.error('❌ Failed to load data from cloud:', error);
          get().showToast('数据加载失败，请稍后重试', 'error');
        } finally {
          set({ isSyncing: false });
        }
      },

      syncDataToCloud: async () => {
        const state = get();
        if (!state.isAuthenticated) return;

        try {
          set({ isSyncing: true });
          const { showToast } = get();
          const syncErrors: string[] = [];

          // Sync all data in parallel
          const results = await Promise.allSettled([
            syncProfile(state.profile),
            syncWords(state.words),
            syncWordExplanations(state.learnState.wordExplanations || {}),
            syncTokenUsage(state.tokenUsage),
            syncReadingArticles(state.readingState.articles)
          ]);

          const labels = ['profile', 'words', 'word explanations', 'token usage', 'reading articles'];
          results.forEach((result, index) => {
            const label = labels[index];
            if (result.status === 'rejected') {
              console.error(`❌ sync ${label} failed:`, result.reason);
              syncErrors.push(label);
              return;
            }
            if (result.value?.error) {
              console.error(`❌ sync ${label} error:`, result.value.error);
              syncErrors.push(label);
            }
          });

          if (syncErrors.length === 0) {
            console.log('✅ Data synced to cloud');
          } else {
            showToast('云端同步部分失败，请稍后重试', 'warning');
          }
        } catch (error) {
          console.error('❌ Failed to sync data to cloud:', error);
          get().showToast('云端同步失败，请稍后重试', 'error');
        } finally {
          set({ isSyncing: false });
        }
      },

      logout: async () => {
        const { signOut } = await import('./services/supabase');
        await signOut();
        set({
          user: null,
          isAuthenticated: false,
          // Optionally clear local data
          profile: {
            name: '',
            city: '',
            occupation: '',
            hobbies: '',
            frequentPlaces: '',
            savedContexts: [],
            checkInHistory: [], // ✅ Clear check-in history on logout
          },
          isProfileSet: false,
          words: [],
          learnState: {
            currentStep: 'input',
            dailyContext: '',
            learningQueue: [],
            currentWordIndex: 0,
            wordSubStep: 'explanation',
            reviewStep: 'speak',
            reviewAttempt: '',
            wordExplanations: {},
            userSentences: {},
            conversationMessages: [],
            conversationQuestions: [],
            currentConversationIndex: 0,
          },
          tokenUsage: {
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0,
          }
        });
      },

      // Toast Notifications
      toasts: [],
      showToast: (message, type) => {
        const id = Date.now().toString();
        set((state) => ({
          toasts: [...state.toasts, { id, message, type }]
        }));
      },
      hideToast: (id) => set((state) => ({
        toasts: state.toasts.filter(toast => toast.id !== id)
      })),

      profile: {
        name: '',
        city: '',
        occupation: '',
        hobbies: '',
        frequentPlaces: '',
        savedContexts: [],
        checkInHistory: [], // ✅ Initialize check-in history
      },
      isProfileSet: false,
      updateProfile: (profile) => {
        set((state) => ({
          profile: { ...state.profile, ...profile },
          isProfileSet: true
        }));
        // Sync to cloud after update
        setTimeout(() => get().syncDataToCloud(), 100);
      },

      // Token Usage Tracking
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
      addTokenUsage: (inputTokens, outputTokens) => {
        set((state) => {
          const newInputTokens = state.tokenUsage.inputTokens + inputTokens;
          const newOutputTokens = state.tokenUsage.outputTokens + outputTokens;
          // Claude Haiku 3.5 pricing: $0.80/M input, $4.00/M output
          const inputCost = (newInputTokens / 1000000) * 0.80;
          const outputCost = (newOutputTokens / 1000000) * 4.00;
          const totalCost = inputCost + outputCost;

          return {
            tokenUsage: {
              inputTokens: newInputTokens,
              outputTokens: newOutputTokens,
              totalCost: totalCost,
            }
          };
        });
        // Sync to cloud
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      resetTokenUsage: () => set({
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalCost: 0,
        }
      }),
      addSavedContext: (text) => set((state) => ({
        profile: {
            ...state.profile,
            savedContexts: [
                { id: crypto.randomUUID(), text, createdAt: new Date().toISOString() },
                ...(state.profile.savedContexts || [])
            ]
        }
      })),
      removeSavedContext: (id) => set((state) => ({
        profile: {
            ...state.profile,
            savedContexts: (state.profile.savedContexts || []).filter(c => c.id !== id)
        }
      })),

      // ✅ Check-in System Methods
      addCheckIn: (date, groupsCompleted, wordIds) => {
        set((state) => {
          const history = state.profile.checkInHistory || [];
          const existingIndex = history.findIndex(record => record.date === date);

          if (existingIndex >= 0) {
            // Update existing record
            const updated = [...history];
            updated[existingIndex] = {
              ...updated[existingIndex],
              groupsCompleted,
              wordsLearned: [...new Set([...updated[existingIndex].wordsLearned, ...wordIds])], // Merge word IDs
            };
            return {
              profile: {
                ...state.profile,
                checkInHistory: updated
              }
            };
          } else {
            // Create new record
            return {
              profile: {
                ...state.profile,
                checkInHistory: [
                  {
                    date,
                    groupsCompleted,
                    wordsLearned: wordIds,
                    createdAt: new Date().toISOString()
                  },
                  ...history
                ]
              }
            };
          }
        });
        setTimeout(() => get().syncDataToCloud(), 100);
      },

      getCheckInRecord: (date) => {
        const history = get().profile.checkInHistory || [];
        return history.find(record => record.date === date);
      },

      getTotalCheckInDays: () => {
        const history = get().profile.checkInHistory || [];
        return history.filter(record => record.groupsCompleted > 0).length;
      },

      getRecentCheckIns: (days) => {
        const history = get().profile.checkInHistory || [];
        const today = new Date();
        const cutoffDate = new Date(today);
        cutoffDate.setDate(cutoffDate.getDate() - days);

        return history
          .filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= cutoffDate && recordDate <= today;
          })
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },

      getMakeupEligibleDates: () => {
        const today = new Date();
        const eligibleDates: string[] = [];

        for (let i = 1; i <= 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];

          const checkIn = get().getCheckInRecord(dateStr);
          if (!checkIn || checkIn.groupsCompleted === 0) {
            eligibleDates.push(dateStr);
          }
        }

        return eligibleDates;
      },

      makeupCheckIn: (targetDate) => {
        const today = new Date().toISOString().split('T')[0];
        const todayCheckIn = get().getCheckInRecord(today);

        if (!todayCheckIn || todayCheckIn.groupsCompleted < 2) {
          get().showToast('今天还没有多余的组数可以补卡', 'error');
          return false;
        }

        // Deduct 1 group from today
        get().addCheckIn(today, todayCheckIn.groupsCompleted - 1, todayCheckIn.wordsLearned);

        // Add 1 group to target date
        const targetCheckIn = get().getCheckInRecord(targetDate);
        get().addCheckIn(
          targetDate,
          (targetCheckIn?.groupsCompleted || 0) + 1,
          todayCheckIn.wordsLearned
        );

        get().showToast('补卡成功！', 'success');
        return true;
      },

      words: [],
      getActiveWords: () => {
        return get().words.filter(w => !w.deleted);
      },
      getDeletedWords: () => {
        return get().words.filter(w => w.deleted);
      },
      restoreWord: (id) => {
        set((state) => ({
          words: state.words.map(w =>
            w.id === id
              ? { ...w, deleted: false, deletedAt: undefined }
              : w
          )
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      permanentlyDeleteWord: (id) => {
        set((state) => ({
          words: state.words.filter(w => w.id !== id)
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      addWord: async (text) => {
        const word = text.trim().toLowerCase();

        // Check for duplicate
        const state = get();
        const existing = state.words.find(w => w.text.toLowerCase() === word);
        if (existing) {
          // Return existing word info so caller can handle duplicate
          return { duplicate: true, existingWord: existing };
        }

        // Fetch phonetic from dictionary API
        let phonetic = '';
        try {
          const dictEntry = await fetchWordDefinition(word);
          phonetic = dictEntry?.phonetic || '';
          console.log(`✅ Fetched phonetic for "${word}":`, phonetic);
        } catch (error) {
          console.warn(`⚠️ Failed to fetch phonetic for "${word}":`, error);
        }

        set((state) => ({
          words: [
            {
              id: crypto.randomUUID(),
              text: word,
              phonetic,
              addedAt: new Date().toISOString(),
              learned: false
            },
            ...state.words
          ]
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
        return { duplicate: false };
      },
      removeWord: (id) => {
        // ✅ Soft delete: mark as deleted instead of removing
        set((state) => ({
          words: state.words.map(w =>
            w.id === id
              ? { ...w, deleted: true, deletedAt: new Date().toISOString() }
              : w
          )
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      bulkAddWords: async (text) => {
        // ✅ Enhanced helper function to clean raw word input
        const cleanWord = (rawText: string): string => {
          let cleaned = rawText;

          // 1. Remove phonetic notations: [...] and /.../
          cleaned = cleaned.replace(/\[.*?\]/g, '');
          cleaned = cleaned.replace(/\/.*?\//g, '');

          // 2. Remove Chinese characters and everything after them
          cleaned = cleaned.replace(/[\u4e00-\u9fa5].*$/g, '');

          // 3. Remove everything after = (translations)
          cleaned = cleaned.split('=')[0];

          // 4. Remove everything after + (grammar notes)
          cleaned = cleaned.split('+')[0];

          // 5. Remove part-of-speech tags (adj. adv. v. n. etc.)
          cleaned = cleaned.replace(/\b(adj|adv|v|n|prep|conj|pron|interj|det|aux)\b\.?/gi, '');

          // 6. Remove content in parentheses (notes)
          cleaned = cleaned.replace(/\(.*?\)/g, '');
          cleaned = cleaned.replace(/（.*?）/g, ''); // Chinese parentheses

          // 7. Extract first English word or phrase (up to 4 words)
          const words = cleaned.trim().split(/\s+/).filter(w => /^[a-zA-Z'-]+$/.test(w));
          if (words.length === 0) return '';

          // Keep phrases (2-4 words) or single words
          if (words.length <= 4) {
            cleaned = words.join(' ');
          } else {
            cleaned = words[0]; // Take first word only if more than 4 words
          }

          // 8. Convert to lowercase
          cleaned = cleaned.toLowerCase().trim();

          return cleaned;
        };

        const rawWords = text.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);
        const cleanedWords = rawWords.map(cleanWord).filter(w => w.length > 0);

        // Check for duplicates
        const state = get();
        const duplicates: Array<{ word: string; existingWord: Word }> = [];
        const newWords: string[] = [];

        for (const word of cleanedWords) {
          const existing = state.words.find(w => w.text.toLowerCase() === word.toLowerCase());
          if (existing) {
            console.log(`🔍 Found duplicate: "${word}" (existing: "${existing.text}")`);
            duplicates.push({ word, existingWord: existing });
          } else {
            newWords.push(word);
          }
        }
        console.log(`📋 Cleaned words: ${cleanedWords.length}, New: ${newWords.length}, Duplicates: ${duplicates.length}`);

        // Add new words first (even if there are duplicates)
        if (newWords.length > 0) {
          const now = new Date().toISOString();
          const wordObjects = await Promise.all(
            newWords.map(async (wordText) => {
              let phonetic = '';
              try {
                const dictEntry = await fetchWordDefinition(wordText);
                phonetic = dictEntry?.phonetic || '';
              } catch (error) {
                console.warn(`⚠️ Failed to fetch phonetic for "${wordText}"`);
              }

              return {
                id: crypto.randomUUID(),
                text: wordText,
                phonetic,
                addedAt: now,
                learned: false
              };
            })
          );

          set((state) => ({ words: [...wordObjects, ...state.words] }));
          setTimeout(() => get().syncDataToCloud(), 100);
        }

        // Return result with duplicate info
        return { duplicates, newWords, totalProcessed: cleanedWords.length };
      },
      bulkAddWordsForce: async (wordsToAdd: string[]) => {
        // Force add words without duplicate checking (user has already confirmed)
        const now = new Date().toISOString();
        const wordObjects = await Promise.all(
          wordsToAdd.map(async (wordText) => {
            let phonetic = '';
            try {
              const dictEntry = await fetchWordDefinition(wordText);
              phonetic = dictEntry?.phonetic || '';
            } catch (error) {
              console.warn(`⚠️ Failed to fetch phonetic for "${wordText}"`);
            }

            return {
              id: crypto.randomUUID(),
              text: wordText,
              phonetic,
              addedAt: now,
              learned: false
            };
          })
        );

        set((state) => ({ words: [...wordObjects, ...state.words] }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      quickAddLearnedWords: async (text: string) => {
        // Helper function to clean raw word input (reuse from bulkAddWords)
        const cleanWord = (rawText: string): string => {
          let cleaned = rawText;
          cleaned = cleaned.replace(/\[.*?\]/g, '');
          cleaned = cleaned.replace(/\/.*?\//g, '');
          cleaned = cleaned.replace(/[\u4e00-\u9fa5].*$/g, '');
          cleaned = cleaned.split('=')[0];
          cleaned = cleaned.split('+')[0];
          cleaned = cleaned.replace(/\b(adj|adv|v|n|prep|conj|pron|interj|det|aux)\b\.?/gi, '');
          cleaned = cleaned.replace(/\(.*?\)/g, '');
          cleaned = cleaned.replace(/（.*?）/g, '');
          const words = cleaned.trim().split(/\s+/).filter(w => /^[a-zA-Z'-]+$/.test(w));
          if (words.length === 0) return '';
          if (words.length <= 4) {
            cleaned = words.join(' ');
          } else {
            cleaned = words[0];
          }
          cleaned = cleaned.toLowerCase().trim();
          return cleaned;
        };

        const rawWords = text.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);
        const cleanedWords = rawWords.map(cleanWord).filter(w => w.length > 0);

        // Check for duplicates (only check non-deleted words)
        const state = get();
        const duplicates: string[] = [];
        const newWords: string[] = [];

        for (const word of cleanedWords) {
          const existing = state.words.find(w => !w.deleted && w.text.toLowerCase() === word.toLowerCase());
          if (existing) {
            duplicates.push(word);
          } else {
            newWords.push(word);
          }
        }

        // Add new learned words with complete data
        if (newWords.length > 0) {
          const now = new Date();
          const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

          const wordObjects = await Promise.all(
            newWords.map(async (wordText) => {
              // Fetch phonetic
              let phonetic = '';
              try {
                const dictEntry = await fetchWordDefinition(wordText);
                phonetic = dictEntry?.phonetic || '';
              } catch (error) {
                console.warn(`⚠️ Failed to fetch phonetic for "${wordText}"`);
              }

              // Generate 3 placeholder sentences
              const userSentences = [
                {
                  sentence: `I learned the word "${wordText}" today.`,
                  translation: `我今天学习了"${wordText}"这个词。`,
                  createdAt: now.toISOString()
                },
                {
                  sentence: `The word "${wordText}" is useful in conversations.`,
                  translation: `"${wordText}"这个词在对话中很有用。`,
                  createdAt: now.toISOString()
                },
                {
                  sentence: `I need to practice using "${wordText}" more often.`,
                  translation: `我需要更多地练习使用"${wordText}"。`,
                  createdAt: now.toISOString()
                }
              ];

              return {
                id: crypto.randomUUID(),
                text: wordText,
                phonetic,
                addedAt: now.toISOString(),
                learned: true,
                userSentences,
                reviewCount: 0,
                nextReviewDate: oneDayLater.toISOString(),
                reviewStats: { retryCount: 0, skipped: false }
              };
            })
          );

          set((state) => ({ words: [...wordObjects, ...state.words] }));
          setTimeout(() => get().syncDataToCloud(), 100);
        }

        return { added: newWords.length, duplicates };
      },
      markWordAsLearned: (wordId) => {
        const now = new Date();
        const oneDayLater = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

        set((state) => ({
          words: state.words.map(w =>
            w.id === wordId
              ? {
                  ...w,
                  learned: true,
                  lastPracticed: now.toISOString(),
                  nextReviewDate: oneDayLater.toISOString(),  // ✅ First review: 1 day later (Ebbinghaus curve)
                  reviewCount: 0  // ✅ Track number of successful reviews
                }
              : w
          )
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      addUserSentence: (wordId, sentence, translation) => {
        set((state) => ({
          words: state.words.map(w => {
            if (w.id === wordId) {
              const existingSentences = w.userSentences || [];
              const newSentence: import('./types').UserSentence = {
                sentence,
                translation,
                createdAt: new Date().toISOString()
              };
              return {
                ...w,
                userSentences: [...existingSentences, newSentence]
              };
            }
            return w;
          })
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      updateReviewStats: (wordId, stats) => set((state) => {
        // ✅ Calculate next review date based on Ebbinghaus forgetting curve
        const calculateNextReviewDate = (
          stats: import('./types').ReviewStats,
          currentReviewCount: number
        ): string => {
          const today = new Date();
          let daysToAdd = 1; // default: tomorrow

          // Performance-based intervals following spaced repetition
          if (stats.skipped || stats.retryCount >= 3) {
            // Poor performance → Review tomorrow
            daysToAdd = 1;
          } else if (stats.retryCount >= 1) {
            // Moderate performance → Shorter intervals
            if (currentReviewCount === 0) daysToAdd = 2;       // 2 days
            else if (currentReviewCount === 1) daysToAdd = 3;  // 3 days
            else if (currentReviewCount === 2) daysToAdd = 7;  // 7 days
            else daysToAdd = 15;                               // 15 days
          } else {
            // Perfect performance → Standard Ebbinghaus intervals
            // Review count: 0→1, 1→2, 2→3, 3→4, 4→5, 5+
            if (currentReviewCount === 0) daysToAdd = 3;       // Day 1 → Day 4
            else if (currentReviewCount === 1) daysToAdd = 7;  // Day 4 → Day 11
            else if (currentReviewCount === 2) daysToAdd = 15; // Day 11 → Day 26
            else if (currentReviewCount === 3) daysToAdd = 30; // Day 26 → Day 56
            else daysToAdd = 90;                               // Day 56+ → 3 months
          }

          const nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + daysToAdd);
          return nextDate.toISOString();
        };

        return {
          words: state.words.map(w => {
            if (w.id === wordId) {
              const currentReviewCount = w.reviewCount || 0;
              const nextReviewDate = calculateNextReviewDate(stats, currentReviewCount);

              // Increment review count only if performance is good (not skipped, retry < 3)
              const newReviewCount = (!stats.skipped && stats.retryCount < 3)
                ? currentReviewCount + 1
                : currentReviewCount;

              return {
                ...w,
                reviewStats: stats,
                learned: !stats.skipped && stats.retryCount < 3,
                nextReviewDate,
                lastPracticed: new Date().toISOString(),
                reviewCount: newReviewCount
              };
            }
            return w;
          })
        };
      }),

      learnState: {
        currentStep: 'input-context',
        dailyContext: '',
        learningQueue: [],
        currentWordIndex: 0,
        wordSubStep: 'explanation',
        currentSentenceIndex: 0, // ✅ Track current sentence being created (0-2)
        reviewSubStep: undefined,
        currentReviewAttempt: undefined,
        currentReviewSentenceIndex: undefined, // ✅ Track current sentence being reviewed (0-2)
        wordExplanations: {}, // ✅ Initialize empty explanations map
        userSentences: {}, // ✅ Initialize empty user sentences map
      },
      setDailyContext: (context) => set((state) => ({
        learnState: { ...state.learnState, dailyContext: context }
      })),
      startLearning: () => set((state) => {
        // Take top 5 unlearned words, or random 5 if all learned
        let queue = state.words.filter(w => !w.learned).slice(0, 5);
        if (queue.length === 0 && state.words.length > 0) {
           queue = [...state.words].sort(() => 0.5 - Math.random()).slice(0, 5);
        }
        return {
          learnState: {
            ...state.learnState,
            currentStep: 'input-context', // Start with context selection
            learningQueue: queue,
            currentWordIndex: 0,
            wordSubStep: 'explanation',
            currentSentenceIndex: 0 // ✅ Initialize sentence index
              }
        };
      }),
      startLearningWithWords: (wordIds) => set((state) => {
        // ✅ Prepare learning with specific word IDs (stay in input-context to let user enter context)
        const queue = state.words.filter(w => wordIds.includes(w.id));
        return {
          learnState: {
            ...state.learnState,
            currentStep: 'input-context', // ✅ Stay in context input stage
            learningQueue: queue,
            currentWordIndex: 0,
            wordSubStep: 'explanation',
            currentSentenceIndex: 0 // ✅ Initialize sentence index
              }
        };
      }),
      setWordSubStep: (step) => set((state) => ({
        learnState: { ...state.learnState, wordSubStep: step }
      })),
      nextSentence: () => set((state) => ({
        learnState: {
          ...state.learnState,
          currentSentenceIndex: state.learnState.currentSentenceIndex + 1
        }
      })),
      nextWord: () => set((state) => {
        const nextIndex = state.learnState.currentWordIndex + 1;
        if (nextIndex >= state.learnState.learningQueue.length) {
          // All words done, ready for review
          return { learnState: { ...state.learnState, currentStep: 'review', currentWordIndex: 0, currentSentenceIndex: 0, reviewSubStep: 'speaking', currentReviewSentenceIndex: 0 } };
        }
        return {
          learnState: {
            ...state.learnState,
            currentWordIndex: nextIndex,
            wordSubStep: 'explanation',
            currentSentenceIndex: 0 // ✅ Reset sentence index for new word
          }
        };
      }),
      goBackStep: () => set((state) => {
        const { wordSubStep, currentSentenceIndex, currentWordIndex } = state.learnState;

        // In Creation phase
        if (wordSubStep === 'creation') {
          if (currentSentenceIndex > 0) {
            // Go back to previous sentence (2→1 or 1→0)
            return {
              learnState: {
                ...state.learnState,
                currentSentenceIndex: currentSentenceIndex - 1
              }
            };
          } else {
            // At sentence 0, go back to shadowing
            return {
              learnState: {
                ...state.learnState,
                wordSubStep: 'shadowing',
                currentSentenceIndex: 0
              }
            };
          }
        }

        // In Shadowing phase
        if (wordSubStep === 'shadowing') {
          // Go back to explanation
          return {
            learnState: {
              ...state.learnState,
              wordSubStep: 'explanation'
            }
          };
        }

        // In Explanation phase
        if (wordSubStep === 'explanation') {
          if (currentWordIndex > 0) {
            // Go back to previous word's last sentence (Creation, Sentence 2)
            return {
              learnState: {
                ...state.learnState,
                currentWordIndex: currentWordIndex - 1,
                wordSubStep: 'creation',
                currentSentenceIndex: 2
              }
            };
          } else {
            // At first word, can't go back further
            return state;
          }
        }

        // Default: no change
        return state;
      }),
      startReviewPhase: () => set((state) => ({
        learnState: {
          ...state.learnState,
          currentStep: 'review',
          currentWordIndex: 0,
          reviewSubStep: 'speaking',
          currentReviewSentenceIndex: 0 // ✅ Initialize review sentence index
        }
      })),
      setReviewSubStep: (step) => set((state) => ({
        learnState: { ...state.learnState, reviewSubStep: step }
      })),
      setReviewAttempt: (attempt) => set((state) => ({
        learnState: { ...state.learnState, currentReviewAttempt: attempt }
      })),
      nextReviewSentence: () => set((state) => ({
        learnState: {
          ...state.learnState,
          currentReviewSentenceIndex: (state.learnState.currentReviewSentenceIndex || 0) + 1,
          reviewSubStep: 'speaking' // Reset to speaking for next sentence
        }
      })),
      nextReviewWord: (completed) => set((state) => {
        const nextIndex = state.learnState.currentWordIndex + 1;

        if (nextIndex >= state.learnState.learningQueue.length) {
          // All review done, session complete
          return {
            learnState: {
              ...state.learnState,
              currentStep: 'input-context',
              reviewSubStep: undefined,
              currentReviewAttempt: undefined,
              currentReviewSentenceIndex: undefined
            }
          };
        }

        return {
          learnState: {
            ...state.learnState,
            currentWordIndex: nextIndex,
            reviewSubStep: 'speaking',
            currentReviewAttempt: undefined,
            currentReviewSentenceIndex: 0 // ✅ Reset to first sentence for next word
          }
        };
      }),
      resetSession: () => set({
        learnState: {
          currentStep: 'input-context',
          dailyContext: '',
          learningQueue: [],
          currentWordIndex: 0,
          wordSubStep: 'explanation',
          currentSentenceIndex: 0, // ✅ Reset sentence index
          reviewSubStep: undefined, // ✅ Clear review substep
          currentReviewAttempt: undefined, // ✅ Clear review attempt
          currentReviewSentenceIndex: undefined, // ✅ Clear review sentence index
          wordExplanations: {}, // ✅ Clear explanations on reset
          userSentences: {} // ✅ Clear user sentences on reset
        }
      }),
      setWordExplanation: (wordId, explanation) => {
        set((state) => ({
          learnState: {
            ...state.learnState,
            wordExplanations: {
              ...state.learnState.wordExplanations,
              [wordId]: explanation
            }
          }
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      saveUserSentence: (wordId, sentence) => set((state) => {
        const currentIndex = state.learnState.currentSentenceIndex;
        const existingSentences = state.learnState.userSentences?.[wordId] || [];
        const updatedSentences = [...existingSentences];
        updatedSentences[currentIndex] = sentence;

        return {
          learnState: {
            ...state.learnState,
            userSentences: {
              ...state.learnState.userSentences,
              [wordId]: updatedSentences
            }
          }
        };
      }),

      // ✅ Text-based conversation (DEPRECATED - Feature removed, kept for compatibility)
      startConversation: (questions) => {
        // ✅ FIX: Validate questions array is not empty
        if (!questions || questions.length === 0) {
          console.error('❌ Cannot start conversation with empty questions array');
          // Don't change state, stay in current step
          return;
        }

        return set((state) => ({
          learnState: {
            ...state.learnState,
            currentStep: 'conversation',
            conversation: {
              questions: questions, // ✅ Store all questions (validated non-empty)
              currentQuestion: questions[0],
              messages: [{
                role: 'ai',
                text: questions[0]
              }],
              questionIndex: 0,
              totalQuestions: questions.length,
              isWaitingForAnswer: true
            }
          }
        }));
      },

      addConversationMessage: (message) => set((state) => ({
        learnState: {
          ...state.learnState,
          conversation: state.learnState.conversation ? {
            ...state.learnState.conversation,
            messages: [...state.learnState.conversation.messages, message],
            isWaitingForAnswer: message.role === 'ai'
          } : undefined
        }
      })),

      nextConversationQuestion: () => set((state) => {
        const conv = state.learnState.conversation;
        if (!conv) return state;

        const nextIndex = conv.questionIndex + 1;

        // If there are more questions
        if (nextIndex < conv.totalQuestions) {
          const nextQuestion = conv.questions[nextIndex] || '';

          return {
            learnState: {
              ...state.learnState,
              conversation: {
                ...conv,
                currentQuestion: nextQuestion,
                questionIndex: nextIndex,
                isWaitingForAnswer: true,
                messages: [...conv.messages, {
                  role: 'ai',
                  text: nextQuestion
                }]
              }
            }
          };
        }

        // No more questions, conversation complete
        return state;
      }),

      completeConversation: () => set((state) => ({
        learnState: {
          ...state.learnState,
          currentStep: 'input-context',
          conversation: undefined
        }
      })),

      // Dictionary
      dictionary: {
        isOpen: false,
        isLoading: false,
        word: null,
        data: null,
        error: null
      },
      openDictionary: async (word) => {
        // Clean word
        const cleanWord = word.replace(/[^\w\s]|_/g, "").trim();
        set((state) => ({
          dictionary: { ...state.dictionary, isOpen: true, isLoading: true, word: cleanWord, error: null }
        }));
        
        try {
          const data = await fetchWordDefinition(cleanWord);
          set((state) => ({
             dictionary: { ...state.dictionary, isLoading: false, data: data, error: data ? null : 'Definition not found' }
          }));
        } catch (e) {
          set((state) => ({
             dictionary: { ...state.dictionary, isLoading: false, error: 'Failed to load definition' }
          }));
        }
      },
      closeDictionary: () => set((state) => ({
         dictionary: { ...state.dictionary, isOpen: false, word: null, data: null }
      })),

      // Reading
      // Standalone Review Session
      reviewState: {
        isActive: false,
        reviewQueue: [],
        currentWordIndex: null,
        currentSentenceIndex: 0,
        step: 'speaking',
        retryCount: 0,
      },
      startReviewSession: (words) => set(() => ({
        reviewState: {
          isActive: true,
          reviewQueue: words,
          currentWordIndex: 0,
          currentSentenceIndex: 0,
          step: 'speaking',
          userInput: undefined,
          comparisonResult: undefined,
          retryCount: 0,
        }
      })),
      setReviewStep: (step) => set((state) => ({
        reviewState: { ...state.reviewState, step }
      })),
      setReviewInput: (input) => set((state) => ({
        reviewState: { ...state.reviewState, userInput: input }
      })),
      setReviewComparison: (result) => set((state) => ({
        reviewState: { ...state.reviewState, comparisonResult: result, step: 'comparing' }
      })),
      nextReviewSentenceStandalone: () => set((state) => ({
        reviewState: {
          ...state.reviewState,
          currentSentenceIndex: state.reviewState.currentSentenceIndex + 1,
          step: 'speaking',
          userInput: undefined,
          comparisonResult: undefined,
          retryCount: 0,
        }
      })),
      nextReviewWordStandalone: (stats) => {
        const state = get();
        const { currentWordIndex, reviewQueue } = state.reviewState;

        if (currentWordIndex === null) return;

        // Update word stats
        const wordId = reviewQueue[currentWordIndex].id;
        state.updateReviewStats(wordId, stats);

        // Move to next word or finish
        if (currentWordIndex < reviewQueue.length - 1) {
          set({
            reviewState: {
              ...state.reviewState,
              currentWordIndex: currentWordIndex + 1,
              currentSentenceIndex: 0,
              step: 'speaking',
              userInput: undefined,
              comparisonResult: undefined,
              retryCount: 0,
            }
          });
        } else {
          // Review complete
          set({
            reviewState: {
              isActive: false,
              reviewQueue: [],
              currentWordIndex: null,
              currentSentenceIndex: 0,
              step: 'speaking',
              retryCount: 0,
            }
          });
        }
      },
      goBackReview: () => set((state) => {
        const { currentSentenceIndex, currentWordIndex } = state.reviewState;

        if (currentSentenceIndex > 0) {
          // Go back to previous sentence
          return {
            reviewState: {
              ...state.reviewState,
              currentSentenceIndex: currentSentenceIndex - 1,
              step: 'speaking',
              userInput: undefined,
              comparisonResult: undefined,
              retryCount: 0,
            }
          };
        } else if (currentWordIndex !== null && currentWordIndex > 0) {
          // Go back to previous word's last sentence
          const prevWord = state.reviewState.reviewQueue[currentWordIndex - 1];
          const lastSentenceIndex = (prevWord.userSentences?.length || 1) - 1;

          return {
            reviewState: {
              ...state.reviewState,
              currentWordIndex: currentWordIndex - 1,
              currentSentenceIndex: lastSentenceIndex,
              step: 'speaking',
              userInput: undefined,
              comparisonResult: undefined,
              retryCount: 0,
            }
          };
        }

        // Can't go back further
        return state;
      }),
      exitReviewSession: () => set({
        reviewState: {
          isActive: false,
          reviewQueue: [],
          currentWordIndex: null,
          currentSentenceIndex: 0,
          step: 'speaking',
          retryCount: 0,
        }
      }),

      readingState: {
        articles: [],
        currentArticleId: null,
        isPlaying: false,
        currentTime: 0,
        currentSentenceIndex: 0,
        playbackRate: 1.0,
      },
      addArticle: (title, content) => set((state) => {
        // Split content into sentences using .!? as delimiters
        const sentences = content
          .split(/(?<=[.!?])\s+/)
          .map(s => s.trim())
          .filter(s => s.length > 0);

        // Estimate sentence times (50ms per character + 300ms pause)
        const sentenceTimes = [];
        let currentTime = 0;
        for (const sentence of sentences) {
          const duration = sentence.length * 0.05;
          sentenceTimes.push({ start: currentTime, end: currentTime + duration });
          currentTime += duration + 0.3;
        }

        const newArticle: ReadingArticle = {
          id: crypto.randomUUID(),
          title,
          content,
          sentences,
          sentenceTimes,
          createdAt: Date.now(),
          audioStatus: 'pending',
        };

        return {
          readingState: {
            ...state.readingState,
            articles: [newArticle, ...state.readingState.articles],
          }
        };
      }),
      removeArticle: (id) => set((state) => ({
        readingState: {
          ...state.readingState,
          articles: state.readingState.articles.filter(a => a.id !== id),
          currentArticleId: state.readingState.currentArticleId === id ? null : state.readingState.currentArticleId,
        }
      })),
      setCurrentArticle: (id) => set((state) => ({
        readingState: {
          ...state.readingState,
          currentArticleId: id,
          isPlaying: false,
          currentTime: 0,
          currentSentenceIndex: 0,
        }
      })),
      updateArticleAudioStatus: (id, status, audioBlobKey, audioDuration) => set((state) => ({
        readingState: {
          ...state.readingState,
          articles: state.readingState.articles.map(a =>
            a.id === id
              ? { ...a, audioStatus: status, audioBlobKey, audioDuration }
              : a
          ),
        }
      })),
      setPlaybackState: (isPlaying, currentTime, currentSentenceIndex) => set((state) => ({
        readingState: {
          ...state.readingState,
          isPlaying,
          ...(currentTime !== undefined && { currentTime }),
          ...(currentSentenceIndex !== undefined && { currentSentenceIndex }),
        }
      })),
      setPlaybackRate: (rate) => set((state) => ({
        readingState: {
          ...state.readingState,
          playbackRate: rate,
        }
      })),
      updateLastPlayed: (id) => set((state) => ({
        readingState: {
          ...state.readingState,
          articles: state.readingState.articles.map(a =>
            a.id === id
              ? { ...a, lastPlayedAt: Date.now() }
              : a
          ),
        }
      })),
    }),
    {
      name: 'active-vocab-storage',
      partialize: (state) => ({
        profile: state.profile,
        isProfileSet: state.isProfileSet,
        words: state.words,
        tokenUsage: state.tokenUsage, // ✅ Persist token usage
        // Persist learning state with explanations and user sentences
        learnState: {
            ...state.learnState,
            wordExplanations: state.learnState.wordExplanations || {}, // ✅ Ensure always defined
            userSentences: state.learnState.userSentences || {} // ✅ Ensure always defined
        },
        // Persist reading state (articles and metadata, not playback state)
        readingState: {
          articles: state.readingState.articles,
          currentArticleId: null, // Don't persist current article
          isPlaying: false, // Don't persist playback state
          currentTime: 0,
          currentSentenceIndex: 0,
          playbackRate: state.readingState.playbackRate, // Persist playback speed preference
        }
      }),
      // ✅ Merge function to handle old data without wordExplanations and tokenUsage
      merge: (persistedState: any, currentState: any) => {
        // ✅ FIX: Clean invalid translations from persisted data
        const cleanWordExplanations = (explanations: any) => {
          if (!explanations || typeof explanations !== 'object') return {};

          const cleaned: any = {};
          Object.keys(explanations).forEach(wordId => {
            const explanation = explanations[wordId];
            if (explanation && explanation.exampleTranslation) {
              const translation = explanation.exampleTranslation.trim();

              // Validate translation - reject if invalid
              const isInvalid =
                !/[\u4e00-\u9fa5]/.test(translation) ||  // No Chinese characters
                translation.length < 2 ||                // Too short
                /^[^\u4e00-\u9fa5a-zA-Z]+$/.test(translation);  // Only symbols

              if (isInvalid) {
                console.warn(`🧹 Cleaning invalid translation for word ${wordId}:`, JSON.stringify(translation));
                // Replace with fallback message
                cleaned[wordId] = {
                  ...explanation,
                  exampleTranslation: '（翻译失败，请重新生成）'
                };
              } else {
                cleaned[wordId] = explanation;
              }
            } else {
              cleaned[wordId] = explanation;
            }
          });
          return cleaned;
        };

        // ✅ CLOUD-FIRST STRATEGY:
        // If currentState has data (just loaded from cloud), use it
        // Otherwise use persistedState (from localStorage)
        const useCloudWords = currentState.words && currentState.words.length > 0;
        const useCloudProfile = currentState.isAuthenticated && currentState.profile && currentState.profile.name;

        console.log(`🔄 Persist merge: ${useCloudWords ? 'Using cloud words' : 'Using localStorage words'}, ${useCloudProfile ? 'Using cloud profile' : 'Using localStorage profile'}`);

        // ✅ For checkInHistory, ALWAYS prefer cloud data if authenticated
        const finalProfile = useCloudProfile ? currentState.profile : (persistedState.profile || currentState.profile);

        // If user is authenticated and cloud profile exists, use cloud's checkInHistory
        if (currentState.isAuthenticated && currentState.profile && currentState.profile.checkInHistory) {
          finalProfile.checkInHistory = currentState.profile.checkInHistory;
        }

        return {
          ...currentState,
          ...persistedState,
          // ✅ Cloud-first: If cloud data exists (currentState), use it
          words: useCloudWords ? currentState.words : (persistedState.words || []),
          profile: finalProfile,
          isProfileSet: useCloudProfile ? currentState.isProfileSet : (persistedState.isProfileSet || false),
          tokenUsage: persistedState.tokenUsage || {
            inputTokens: 0,
            outputTokens: 0,
            totalCost: 0,
          },
          learnState: {
            ...currentState.learnState,
            ...(persistedState.learnState || {}),
            wordExplanations: cleanWordExplanations(persistedState.learnState?.wordExplanations || {}), // ✅ Clean on load
            userSentences: persistedState.learnState?.userSentences || {} // ✅ Default to empty object
          }
        };
      },
    }
  )
);
