
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Word, LearnState, ChatMessage, SessionSummary, DictionaryState, SavedContext, TokenUsage } from './types';
import { fetchWordDefinition } from './services/dictionary';

interface AppState {
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
  completeLearningPhase: (sceneDescription: string) => void;
  startReviewPhase: () => void; // ✅ Start review phase
  setReviewSubStep: (step: import('./types').ReviewStep) => void; // ✅ Set review substep
  setReviewAttempt: (attempt: string) => void; // ✅ Store current review attempt
  nextReviewWord: (completed: boolean) => void; // ✅ Move to next word in review
  addChatMessage: (message: ChatMessage) => void;
  setSessionSummary: (summary: SessionSummary) => void;
  resetSession: () => void;
  setWordExplanation: (wordId: string, explanation: import('./types').WordExplanation) => void; // ✅ Store explanation
  saveUserSentence: (wordId: string, sentence: string) => void; // ✅ Save user's created sentence (for scene generation)

  // Dictionary
  dictionary: DictionaryState;
  openDictionary: (word: string) => Promise<void>;
  closeDictionary: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      profile: {
        name: '',
        city: '',
        occupation: '',
        hobbies: '',
        frequentPlaces: '',
        savedContexts: [],
      },
      isProfileSet: false,
      updateProfile: (profile) => set((state) => ({
        profile: { ...state.profile, ...profile },
        isProfileSet: true
      })),

      // Token Usage Tracking
      tokenUsage: {
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
      addTokenUsage: (inputTokens, outputTokens) => set((state) => {
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
      }),
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
      addWord: (text) => set((state) => ({
        words: [
          { id: crypto.randomUUID(), text: text.trim(), addedAt: new Date().toISOString(), learned: false },
          ...state.words
        ]
      })),
      removeWord: (id) => set((state) => ({
        words: state.words.filter((w) => w.id !== id)
      })),
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
      markWordAsLearned: (wordId) => set((state) => ({
        words: state.words.map(w =>
          w.id === wordId
            ? { ...w, learned: true, lastPracticed: new Date().toISOString() }
            : w
        )
      })),
      saveWordSentence: (wordId, sentence, translation) => set((state) => ({
        words: state.words.map(w =>
          w.id === wordId
            ? { ...w, userSentence: sentence, userSentenceTranslation: translation }
            : w
        )
      })),
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
        conversationHistory: [],
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
            conversationHistory: [],
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
            conversationHistory: [],
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
      completeLearningPhase: (scene) => set((state) => ({
        learnState: { ...state.learnState, currentStep: 'conversation', generatedScene: scene }
      })),
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
          // All review done, move to conversation
          return {
            learnState: {
              ...state.learnState,
              currentStep: 'conversation',
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
      addChatMessage: (message) => set((state) => ({
        learnState: { 
          ...state.learnState, 
          conversationHistory: [...state.learnState.conversationHistory, message] 
        }
      })),
      setSessionSummary: (summary) => set((state) => {
         // Mark used words as learned
         const learnedIds = state.learnState.learningQueue
            .filter(w => summary.usedWords.includes(w.text))
            .map(w => w.id);
            
         const updatedWords = state.words.map(w => 
            learnedIds.includes(w.id) ? { ...w, learned: true, lastPracticed: new Date().toISOString() } : w
         );

         return {
            words: updatedWords,
            learnState: { ...state.learnState, currentStep: 'summary', sessionSummary: summary }
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
          generatedScene: undefined,
          conversationHistory: [],
          sessionSummary: undefined,
          wordExplanations: {}, // ✅ Clear explanations on reset
          userSentences: {} // ✅ Clear user sentences on reset
        }
      }),
      setWordExplanation: (wordId, explanation) => set((state) => ({
        learnState: {
          ...state.learnState,
          wordExplanations: {
            ...state.learnState.wordExplanations,
            [wordId]: explanation
          }
        }
      })),
      saveUserSentence: (wordId, sentence) => set((state) => ({
        learnState: {
          ...state.learnState,
          userSentences: {
            ...state.learnState.userSentences,
            [wordId]: sentence
          }
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
        }
      }),
      // ✅ Merge function to handle old data without wordExplanations and tokenUsage
      merge: (persistedState: any, currentState: any) => ({
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
          wordExplanations: persistedState.learnState?.wordExplanations || {}, // ✅ Default to empty object
          userSentences: persistedState.learnState?.userSentences || {} // ✅ Default to empty object
        }
      }),
    }
  )
);
