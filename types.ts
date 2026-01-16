
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

export interface UserSentence {
  sentence: string;
  translation: string;
  createdAt: string; // ISO date string
}

export interface Word {
  id: string;
  text: string;
  phonetic?: string; // ✅ American English phonetic (e.g., /ˈtɪltɪŋ/)
  addedAt: string; // ISO date string
  learned: boolean;
  lastPracticed?: string; // ISO date string
  userSentences?: UserSentence[]; // ✅ User's created sentences (up to 3)
  reviewStats?: ReviewStats; // ✅ Review statistics
  nextReviewDate?: string; // ✅ Next review date (ISO string) - for spaced repetition
  reviewCount?: number; // ✅ Number of successful reviews (for Ebbinghaus intervals)
}

export type WordStep = 'explanation' | 'shadowing' | 'creation';

export type ReviewStep = 'speaking' | 'comparing';

// ✅ Text-based conversation Q&A (DEPRECATED - Feature removed, kept for compatibility)
export interface ConversationMessage {
  role: 'ai' | 'user';
  text: string;
  correction?: {
    correctedText: string;
    feedback: string;
  };
}

export interface ConversationState {
  questions: string[]; // All questions
  currentQuestion: string;
  messages: ConversationMessage[];
  questionIndex: number;
  totalQuestions: number;
  isWaitingForAnswer: boolean;
}

export interface LearnState {
  currentStep: 'input-context' | 'learning' | 'review' | 'conversation';
  dailyContext: string;
  learningQueue: Word[];
  currentWordIndex: number;
  wordSubStep: WordStep;
  currentSentenceIndex: number; // ✅ Track which sentence user is creating (0-2)
  reviewSubStep?: ReviewStep; // ✅ Review substep
  currentReviewAttempt?: string; // ✅ Current user's spoken sentence in review
  currentReviewSentenceIndex?: number; // ✅ Track which sentence is being reviewed (0-2)
  wordExplanations: { [wordId: string]: WordExplanation }; // ✅ Store explanations to avoid regeneration
  userSentences: { [wordId: string]: string }; // ✅ Store user's created sentences (temp storage during learning)
  conversation?: ConversationState; // ✅ Text-based conversation state
}

// ✅ Independent Review State (for standalone Review page)
export interface ReviewState {
  isActive: boolean; // Whether review session is active
  reviewQueue: Word[]; // Words due for review
  currentWordIndex: number | null; // Current word being reviewed
  currentSentenceIndex: number; // Current sentence (0-2)
  step: 'speaking' | 'comparing'; // Current step
  userInput?: string; // User's spoken/typed input
  comparisonResult?: {
    similarity: number;
    feedback: string;
    differences: string[];
  };
  retryCount: number; // Number of retries for current sentence
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

// Reading Types
export interface ReadingArticle {
  id: string;
  title: string;
  content: string;
  sentences: string[];           // Split sentences for highlighting
  createdAt: number;
  lastPlayedAt?: number;

  // Audio related
  audioStatus: 'pending' | 'generating' | 'ready' | 'failed';
  audioBlobKey?: string;        // IndexedDB key
  audioDuration?: number;       // Total duration in seconds

  // Estimated sentence timeline
  sentenceTimes?: Array<{
    start: number;  // Start time in seconds
    end: number;    // End time in seconds
  }>;
}

export interface ReadingState {
  articles: ReadingArticle[];
  currentArticleId: string | null;

  // Playback state
  isPlaying: boolean;
  currentTime: number;          // Current position in seconds
  currentSentenceIndex: number; // Current highlighted sentence index
  playbackRate: number;         // Playback speed
}
