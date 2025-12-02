
export interface SavedContext {
  id: string;
  text: string;
  createdAt: string;
}

export interface UserProfile {
  name: string;
  city: string;
  occupation: string;
  hobbies: string;
  frequentPlaces: string;
  savedContexts: SavedContext[]; // Added
}

export interface ReviewStats {
  retryCount: number;
  skipped: boolean;
}

export interface Word {
  id: string;
  text: string;
  addedAt: string; // ISO date string
  learned: boolean;
  lastPracticed?: string; // ISO date string
  userSentence?: string; // ✅ User's created sentence for this word
  userSentenceTranslation?: string; // ✅ Chinese translation of user's sentence
  reviewStats?: ReviewStats; // ✅ Review statistics
  nextReviewDate?: string; // ✅ Next review date (ISO string) - for spaced repetition
}

export type WordStep = 'explanation' | 'shadowing' | 'creation';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface SessionSummary {
  usedWords: string[];
  missedWords: string[];
  feedback: string;
}

export type ReviewStep = 'speaking' | 'comparing';

export interface LearnState {
  currentStep: 'input-context' | 'learning' | 'review' | 'conversation' | 'summary';
  dailyContext: string;
  learningQueue: Word[];
  currentWordIndex: number;
  wordSubStep: WordStep;
  reviewSubStep?: ReviewStep; // ✅ Review substep
  currentReviewAttempt?: string; // ✅ Current user's spoken sentence in review
  generatedScene?: string;
  conversationHistory: ChatMessage[];
  sessionSummary?: SessionSummary;
  wordExplanations: { [wordId: string]: WordExplanation }; // ✅ Store explanations to avoid regeneration
  userSentences: { [wordId: string]: string }; // ✅ Store user's created sentences for better scene generation
}

export interface WordExplanation {
  meaning: string;
  example: string;
  exampleTranslation: string;
  phonetic: string; // 美式音标
}

export interface SentenceEvaluation {
  isCorrect: boolean;
  feedback: string;
  betterWay: string;
}

export interface AudioConfig {
  sampleRate: number;
}

// Dictionary Types
export interface DictionaryDefinition {
  definitionEN: string; // Renamed for clarity
  definitionCN: string; // Added Chinese
}

export interface DictionaryMeaning {
  partOfSpeech: string;
  definitions: DictionaryDefinition[];
}

export interface DictionaryEntry {
  word: string;
  phonetic: string;
  meanings: DictionaryMeaning[];
}

export interface DictionaryState {
  isOpen: boolean;
  isLoading: boolean;
  word: string | null;
  data: DictionaryEntry | null;
  error: string | null;
}

// Token Usage Tracking
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalCost: number; // in USD
}
