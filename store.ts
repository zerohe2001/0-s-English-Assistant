
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Word, LearnState, ChatMessage, SessionSummary, DictionaryState, SavedContext } from './types';
import { fetchWordDefinition } from './services/dictionary';

interface AppState {
  // User Profile
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
  addSavedContext: (text: string) => void;
  removeSavedContext: (id: string) => void;
  isProfileSet: boolean;

  // Vocabulary
  words: Word[];
  addWord: (text: string) => void;
  removeWord: (id: string) => void;
  bulkAddWords: (text: string) => void;
  markWordAsLearned: (wordId: string) => void; // ✅ Mark word as learned

  // Learning Session
  learnState: LearnState;
  setDailyContext: (context: string) => void;
  startLearning: () => void;
  setWordSubStep: (step: LearnState['wordSubStep']) => void;
  nextWord: () => void;
  completeLearningPhase: (sceneDescription: string) => void;
  addChatMessage: (message: ChatMessage) => void;
  setSessionSummary: (summary: SessionSummary) => void;
  resetSession: () => void;
  setWordExplanation: (wordId: string, explanation: import('./types').WordExplanation) => void; // ✅ Store explanation

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

      learnState: {
        currentStep: 'input-context',
        dailyContext: '',
        learningQueue: [],
        currentWordIndex: 0,
        wordSubStep: 'explanation',
        conversationHistory: [],
        wordExplanations: {}, // ✅ Initialize empty explanations map
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
      setWordSubStep: (step) => set((state) => ({
        learnState: { ...state.learnState, wordSubStep: step }
      })),
      nextWord: () => set((state) => {
        const nextIndex = state.learnState.currentWordIndex + 1;
        if (nextIndex >= state.learnState.learningQueue.length) {
          // All words done, ready for conversation
          return { learnState: { ...state.learnState, currentStep: 'conversation', wordSubStep: 'explanation' } };
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
          generatedScene: undefined,
          conversationHistory: [],
          sessionSummary: undefined,
          wordExplanations: {} // ✅ Clear explanations on reset
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
        // Persist learning state with explanations
        learnState: {
            ...state.learnState,
            wordExplanations: state.learnState.wordExplanations || {} // ✅ Ensure always defined
        }
      }),
      // ✅ Merge function to handle old data without wordExplanations
      merge: (persistedState: any, currentState: any) => ({
        ...currentState,
        ...persistedState,
        learnState: {
          ...currentState.learnState,
          ...(persistedState.learnState || {}),
          wordExplanations: persistedState.learnState?.wordExplanations || {} // ✅ Default to empty object
        }
      }),
    }
  )
);
