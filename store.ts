
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, Word, LearnState, ChatMessage, SessionSummary, DictionaryState } from './types';
import { fetchWordDefinition } from './services/dictionary';

interface AppState {
  // User Profile
  profile: UserProfile;
  updateProfile: (profile: UserProfile) => void;
  isProfileSet: boolean;

  // Vocabulary
  words: Word[];
  addWord: (text: string) => void;
  removeWord: (id: string) => void;
  bulkAddWords: (text: string) => void;

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
      },
      isProfileSet: false,
      updateProfile: (profile) => set({ profile, isProfileSet: true }),

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
        const newWords = text.split(/[\n,]+/).map(t => t.trim()).filter(t => t.length > 0);
        const wordObjects = newWords.map(w => ({
          id: crypto.randomUUID(),
          text: w,
          addedAt: new Date().toISOString(),
          learned: false
        }));
        return { words: [...wordObjects, ...state.words] };
      }),

      learnState: {
        currentStep: 'input-context',
        dailyContext: '',
        learningQueue: [],
        currentWordIndex: 0,
        wordSubStep: 'explanation',
        conversationHistory: [],
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
          sessionSummary: undefined
        }
      }),

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
        // Don't persist UI states like dictionary or current session specifics indefinitely if reload
        learnState: {
            ...state.learnState,
            // Keep critical session info
        }
      }),
    }
  )
);
