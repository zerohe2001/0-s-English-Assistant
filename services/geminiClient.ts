import { UserProfile } from '../types';

/**
 * Client-side wrapper for Gemini API calls
 * All requests go through /api/gemini Edge Function for security
 */

/**
 * Fast text comparison for typed input (no AI call needed)
 * Returns immediate feedback based on simple text matching
 */
export const compareTextSimilarity = (
  target: string,
  input: string
): { isCorrect: boolean; feedback: string } => {
  // Normalize: lowercase, remove punctuation, trim
  const normalize = (str: string) =>
    str.toLowerCase()
       .replace(/[^\w\s]/g, '') // Remove punctuation
       .replace(/\s+/g, ' ')    // Normalize whitespace
       .trim();

  const targetNorm = normalize(target);
  const inputNorm = normalize(input);

  // Exact match (after normalization)
  if (targetNorm === inputNorm) {
    return {
      isCorrect: true,
      feedback: "Perfect match! ✅"
    };
  }

  // Calculate word-level similarity
  const targetWords = targetNorm.split(/\s+/);
  const inputWords = inputNorm.split(/\s+/);

  // Count matched words
  const matchedWords = inputWords.filter(inputWord =>
    targetWords.some(targetWord => targetWord === inputWord)
  ).length;

  const similarity = targetWords.length > 0 ? matchedWords / targetWords.length : 0;

  if (similarity >= 0.9) {
    return {
      isCorrect: true,
      feedback: "Great! Minor differences but essentially correct."
    };
  } else if (similarity >= 0.7) {
    return {
      isCorrect: true,
      feedback: `Good effort! Match: ${Math.round(similarity * 100)}%. Check for small differences.`
    };
  } else {
    return {
      isCorrect: false,
      feedback: `Please review the target sentence. Match: ${Math.round(similarity * 100)}%. Try again!`
    };
  }
};

/**
 * Quick pre-check for common sentence errors (instant, no AI call)
 * Returns instant feedback for obvious mistakes
 *
 * ⚠️ IMPORTANT: Keep checks minimal - let AI handle grammar/spelling
 */
export const quickCheckSentence = (
  word: string,
  sentence: string,
  exampleSentence?: string
): { passed: boolean; feedback?: string } => {
  const trimmed = sentence.trim();
  const wordLower = word.toLowerCase();
  const sentenceLower = trimmed.toLowerCase();

  // 1. Check for word stem/variations (allow misspellings - AI will catch them)
  // Accept if word root appears (e.g., "tilt" matches "tilting", "tiltling")
  const wordRoot = wordLower.replace(/(ing|ed|s|es)$/, ''); // Remove common endings
  const hasWordStem = sentenceLower.includes(wordRoot);

  if (!hasWordStem) {
    return {
      passed: false,
      feedback: `Please use the word "${word}" in your sentence.`
    };
  }

  // 2. Must be at least 4 words (very basic check)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount < 4) {
    return {
      passed: false,
      feedback: `Please write a complete sentence (at least 4 words). You wrote ${wordCount}.`
    };
  }

  // 3. Cannot just repeat the example sentence (lazy copying)
  if (exampleSentence) {
    const exampleNorm = exampleSentence.toLowerCase().replace(/[^\w\s]/g, '');
    const sentenceNorm = sentenceLower.replace(/[^\w\s]/g, '');

    if (exampleNorm === sentenceNorm) {
      return {
        passed: false,
        feedback: "Please create your own sentence, not copy the example."
      };
    }
  }

  // ✅ Passed basic checks - let AI handle grammar/spelling evaluation
  return { passed: true };
};

/**
 * Generate word explanation via Edge Function
 */
export const generateWordExplanation = async (
  word: string,
  profile: UserProfile,
  context: string
) => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'generateWordExplanation',
      word,
      profile,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to generate word explanation');
  }

  return await response.json();
};

/**
 * Evaluate shadowing practice via Edge Function
 */
export const evaluateShadowing = async (
  targetSentence: string,
  userTranscript: string
) => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'evaluateShadowing',
      targetSentence,
      userTranscript,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to evaluate shadowing');
  }

  return await response.json();
};

/**
 * Evaluate user-created sentence via Edge Function
 */
export const evaluateUserSentence = async (
  word: string,
  userSentence: string,
  context: string
) => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'evaluateUserSentence',
      word,
      userSentence,
      context,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to evaluate sentence');
  }

  return await response.json();
};

/**
 * Translate English to Chinese via Edge Function
 */
export const translateToChinese = async (sentence: string): Promise<string> => {
  const response = await fetch('/api/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'translateToChinese',
      sentence,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to translate');
  }

  const data = await response.json();
  return data.translation;
};
