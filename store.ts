
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Word, LearnState, DictionaryState, SavedContext, TokenUsage, ReadingArticle, ReadingState, ConversationMessage } from './types';
import { fetchWordDefinition } from './services/dictionary';
import { supabase, getCurrentUser, syncProfile, syncWords, syncWordExplanations, syncTokenUsage, fetchProfile, fetchWords, fetchWordExplanations, fetchTokenUsage } from './services/supabase';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

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

  // Token Usage Tracking
  tokenUsage: TokenUsage;
  addTokenUsage: (inputTokens: number, outputTokens: number) => void;
  resetTokenUsage: () => void;

  // Vocabulary
  words: Word[];
  addWord: (text: string) => void;
  removeWord: (id: string) => void;
  bulkAddWords: (text: string) => void;
  markWordAsLearned: (wordId: string) => void; // ✅ Mark word as learned
  saveWordSentence: (wordId: string, sentence: string, translation: string) => void; // ✅ Save sentence to Word object
  updateReviewStats: (wordId: string, stats: import('./types').ReviewStats) => void; // ✅ Update review stats

  // Learning Session
  learnState: LearnState;
  setDailyContext: (context: string) => void;
  startLearning: () => void;
  startLearningWithWords: (wordIds: string[]) => void; // ✅ Start learning with specific words
  setWordSubStep: (step: LearnState['wordSubStep']) => void;
  nextWord: () => void;
  startReviewPhase: () => void; // ✅ Start review phase
  setReviewSubStep: (step: import('./types').ReviewStep) => void; // ✅ Set review substep
  setReviewAttempt: (attempt: string) => void; // ✅ Store current review attempt
  nextReviewWord: (completed: boolean) => void; // ✅ Move to next word in review
  resetSession: () => void;
  setWordExplanation: (wordId: string, explanation: import('./types').WordExplanation) => void; // ✅ Store explanation
  saveUserSentence: (wordId: string, sentence: string) => void; // ✅ Save user's created sentence

  // ✅ Text-based conversation
  startConversation: (questions: string[]) => void;
  addConversationMessage: (message: ConversationMessage) => void;
  nextConversationQuestion: () => void;
  completeConversation: () => void;

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
        }
      },

      loadDataFromCloud: async () => {
        try {
          set({ isSyncing: true });

          // Fetch all data in parallel
          const [profileData, wordsData, explanationsData, tokenData] = await Promise.all([
            fetchProfile(),
            fetchWords(),
            fetchWordExplanations(),
            fetchTokenUsage()
          ]);

          // Update profile
          if (profileData.data) {
            const p = profileData.data;
            set({
              profile: {
                name: p.name,
                level: p.level,
                target: p.target,
                nativeLanguage: p.native_language,
                savedContexts: p.saved_contexts || []
              },
              isProfileSet: true
            });
          }

          // Update words
          if (wordsData.data && wordsData.data.length > 0) {
            set({
              words: wordsData.data.map((w: any) => ({
                id: w.id,
                text: w.text,
                learned: w.learned,
                userSentence: w.user_sentence,
                userSentenceTranslation: w.user_sentence_translation,
                reviewStats: w.review_stats,
                nextReviewDate: w.next_review_date
              }))
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

          console.log('✅ Data loaded from cloud');
        } catch (error) {
          console.error('❌ Failed to load data from cloud:', error);
        } finally {
          set({ isSyncing: false });
        }
      },

      syncDataToCloud: async () => {
        const state = get();
        if (!state.isAuthenticated) return;

        try {
          set({ isSyncing: true });

          // Sync all data in parallel
          await Promise.all([
            syncProfile(state.profile),
            syncWords(state.words),
            syncWordExplanations(state.learnState.wordExplanations || {}),
            syncTokenUsage(state.tokenUsage)
          ]);

          console.log('✅ Data synced to cloud');
        } catch (error) {
          console.error('❌ Failed to sync data to cloud:', error);
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

      words: [],
      addWord: (text) => {
        set((state) => ({
          words: [
            { id: crypto.randomUUID(), text: text.trim(), addedAt: new Date().toISOString(), learned: false },
            ...state.words
          ]
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      removeWord: (id) => {
        set((state) => ({
          words: state.words.filter((w) => w.id !== id)
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      bulkAddWords: (text) => set((state) => {
        // ✅ Helper function to clean raw word input
        const cleanWord = (rawText: string): string => {
          let cleaned = rawText;

          // 1. Remove phonetic notations: [...] and /.../
          cleaned = cleaned.replace(/\[.*?\]/g, '');
          cleaned = cleaned.replace(/\/.*?\//g, '');

          // 2. Remove everything after = (Chinese translations)
          cleaned = cleaned.split('=')[0];

          // 3. Remove everything after + (grammar notes like "+ 从句")
          cleaned = cleaned.split('+')[0];

          // 4. Remove content in parentheses (notes)
          cleaned = cleaned.replace(/\(.*?\)/g, '');
          cleaned = cleaned.replace(/（.*?）/g, ''); // Chinese parentheses

          // 5. Remove extra whitespace and trim
          cleaned = cleaned.trim().replace(/\s+/g, ' ');

          return cleaned;
        };

        const rawWords = text.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);
        const cleanedWords = rawWords.map(cleanWord).filter(w => w.length > 0 && /^[a-zA-Z\s-]+$/.test(w));

        const wordObjects = cleanedWords.map(w => ({
          id: crypto.randomUUID(),
          text: w,
          addedAt: new Date().toISOString(),
          learned: false
        }));

        return { words: [...wordObjects, ...state.words] };
      }),
      markWordAsLearned: (wordId) => {
        set((state) => ({
          words: state.words.map(w =>
            w.id === wordId
              ? { ...w, learned: true, lastPracticed: new Date().toISOString() }
              : w
          )
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      saveWordSentence: (wordId, sentence, translation) => {
        set((state) => ({
          words: state.words.map(w =>
            w.id === wordId
              ? { ...w, userSentence: sentence, userSentenceTranslation: translation }
              : w
          )
        }));
        setTimeout(() => get().syncDataToCloud(), 100);
      },
      updateReviewStats: (wordId, stats) => set((state) => {
        // ✅ Calculate next review date based on performance
        const calculateNextReviewDate = (stats: import('./types').ReviewStats): string => {
          const today = new Date();
          let daysToAdd = 1; // default: tomorrow

          if (stats.skipped || stats.retryCount >= 3) {
            // 跳过或重试≥3次 → 明天复习
            daysToAdd = 1;
          } else if (stats.retryCount >= 1) {
            // 重试1-2次 → 3天后复习
            daysToAdd = 3;
          } else {
            // 完美通过（retry=0） → 7天后复习
            daysToAdd = 7;
          }

          const nextDate = new Date(today);
          nextDate.setDate(nextDate.getDate() + daysToAdd);
          return nextDate.toISOString();
        };

        const nextReviewDate = calculateNextReviewDate(stats);

        return {
          words: state.words.map(w =>
            w.id === wordId
              ? {
                  ...w,
                  reviewStats: stats,
                  learned: !stats.skipped && stats.retryCount < 3,
                  nextReviewDate,
                  lastPracticed: new Date().toISOString()
                }
              : w
          )
        };
      }),

      learnState: {
        currentStep: 'input-context',
        dailyContext: '',
        learningQueue: [],
        currentWordIndex: 0,
        wordSubStep: 'explanation',
        reviewSubStep: undefined,
        currentReviewAttempt: undefined,
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
            currentStep: 'learning',
            learningQueue: queue,
            currentWordIndex: 0,
            wordSubStep: 'explanation',
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
              }
        };
      }),
      setWordSubStep: (step) => set((state) => ({
        learnState: { ...state.learnState, wordSubStep: step }
      })),
      nextWord: () => set((state) => {
        const nextIndex = state.learnState.currentWordIndex + 1;
        if (nextIndex >= state.learnState.learningQueue.length) {
          // All words done, ready for review
          return { learnState: { ...state.learnState, currentStep: 'review', currentWordIndex: 0, reviewSubStep: 'speaking' } };
        }
        return {
          learnState: {
            ...state.learnState,
            currentWordIndex: nextIndex,
            wordSubStep: 'explanation'
          }
        };
      }),
      startReviewPhase: () => set((state) => ({
        learnState: {
          ...state.learnState,
          currentStep: 'review',
          currentWordIndex: 0,
          reviewSubStep: 'speaking'
        }
      })),
      setReviewSubStep: (step) => set((state) => ({
        learnState: { ...state.learnState, reviewSubStep: step }
      })),
      setReviewAttempt: (attempt) => set((state) => ({
        learnState: { ...state.learnState, currentReviewAttempt: attempt }
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
              currentReviewAttempt: undefined
            }
          };
        }

        return {
          learnState: {
            ...state.learnState,
            currentWordIndex: nextIndex,
            reviewSubStep: 'speaking',
            currentReviewAttempt: undefined
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
          reviewSubStep: undefined, // ✅ Clear review substep
          currentReviewAttempt: undefined, // ✅ Clear review attempt
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
      saveUserSentence: (wordId, sentence) => set((state) => ({
        learnState: {
          ...state.learnState,
          userSentences: {
            ...state.learnState.userSentences,
            [wordId]: sentence
          }
        }
      })),

      // ✅ Text-based conversation
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

        return {
          ...currentState,
          ...persistedState,
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
