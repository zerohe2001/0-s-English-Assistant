
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

export interface Word {
  id: string;
  text: string;
  addedAt: string; // ISO date string
  learned: boolean;
  lastPracticed?: string; // ISO date string
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

export interface LearnState {
  currentStep: 'input-context' | 'learning' | 'conversation' | 'summary';
  dailyContext: string;
  learningQueue: Word[];
  currentWordIndex: number;
  wordSubStep: WordStep;
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
