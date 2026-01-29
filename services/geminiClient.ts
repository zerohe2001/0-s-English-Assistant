import { UserProfile } from '../types';

/**
 * Client-side wrapper for Gemini API calls
 * All requests go through /api/gemini Edge Function for security
 */

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.clone().json();
    if (data?.message) return data.message;
  } catch {
    // Ignore JSON parse errors
  }
  try {
    const text = await response.text();
    if (text) return text;
  } catch {
    // Ignore text read errors
  }
  return `Request failed (${response.status})`;
};

const postGemini = async (payload: Record<string, unknown>) => {
  let response: Response;
  try {
    response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Network error. Please check your connection.');
  }

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || 'Request failed');
  }

  try {
    return await response.json();
  } catch {
    throw new Error('Invalid response from server');
  }
};

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

  // 1. Check for word presence with flexible matching
  // Strategy: Handle both single words and phrases (like "come across")

  // For phrases (contains space), check each word separately
  const wordParts = wordLower.split(/\s+/);

  // Handle "X to do" pattern - "do" is a verb placeholder
  // Examples: "keen to do", "want to do", "like to do"
  if (wordParts.length >= 2) {
    const lastTwo = wordParts.slice(-2);  // e.g., ["to", "do"]

    if (lastTwo[0] === 'to' && lastTwo[1] === 'do') {
      // Pattern ends with "to do" - check prefix + "to" + ANY verb
      const prefix = wordParts.slice(0, -2);  // e.g., ["keen"] or []

      // All prefix parts must be present
      const prefixPresent = prefix.length === 0 || prefix.every(part =>
        sentenceLower.includes(part)
      );

      // Must have "to" followed by any word (the actual verb used)
      const hasToVerb = /\bto\s+\w+/.test(sentenceLower);

      if (!prefixPresent || !hasToVerb) {
        return {
          passed: false,
          feedback: `Please use the pattern "${word}" with any verb (e.g., "${prefix.length > 0 ? prefix[0] : 'want'} to learn", "${prefix.length > 0 ? prefix[0] : 'want'} to try").`
        };
      }
      // Pattern matched! Continue to other checks (word count, not copying example)
      // Skip to the checks after phrase matching by setting a flag
    }
  }

  // Check if this is a "to do" pattern (already handled above)
  const isToDoPattern = wordParts.length >= 2 &&
    wordParts.slice(-2)[0] === 'to' &&
    wordParts.slice(-2)[1] === 'do';

  if (wordParts.length > 1 && !isToDoPattern) {
    // Phrase like "come across" - check if all parts are present (with flexible matching)
    // BE verb conjugations - "be" is highly irregular and needs special handling
    const beVerbs = ['be', 'am', 'is', 'are', 'was', 'were', 'been', 'being'];

    const allPartsPresent = wordParts.every(part => {
      // For each part, check:
      // 1. Exact match (e.g., "across" in "came across")
      if (sentenceLower.includes(part)) {
        return true;
      }

      // 2. Special handling for "be" verb - matches all conjugations
      if (part === 'be') {
        const cleanSentence = sentenceLower.replace(/[^\w\s]/g, ' ');
        const sentenceWords = cleanSentence.split(/\s+/).filter(w => w.length > 0);
        return sentenceWords.some(w => beVerbs.includes(w));
      }

      // 3. For other irregular verbs and inflections, check with flexible matching
      // Extract only alphanumeric characters from sentence for matching
      const cleanSentence = sentenceLower.replace(/[^\w\s]/g, ' ');
      const sentenceWords = cleanSentence.split(/\s+/).filter(w => w.length > 0);

      // Check if any word matches with first 2-3 chars and similar length
      return sentenceWords.some(w => {
        // Match first 2 chars (catches come→came, run→ran)
        const matches2Chars = w.substring(0, 2) === part.substring(0, 2);
        const similarLength = Math.abs(w.length - part.length) <= 2;

        return matches2Chars && similarLength;
      });
    });

    if (!allPartsPresent) {
      return {
        passed: false,
        feedback: `Please use the phrase "${word}" (or its variations like past tense) in your sentence.`
      };
    }
  } else if (wordParts.length === 1) {
    // Single word - use prefix matching for inflections
    const minMatchLength = Math.min(4, wordLower.length - 1);
    const wordPrefix = wordLower.substring(0, minMatchLength);

    const hasWord = sentenceLower.includes(wordLower) ||
                    sentenceLower.includes(wordPrefix);

    if (!hasWord) {
      return {
        passed: false,
        feedback: `Please use the word "${word}" in your sentence.`
      };
    }
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
  return await postGemini({
    action: 'generateWordExplanation',
    word,
    profile,
    context,
  });
};

/**
 * Evaluate shadowing practice via Edge Function
 */
export const evaluateShadowing = async (
  targetSentence: string,
  userTranscript: string
) => {
  return await postGemini({
    action: 'evaluateShadowing',
    targetSentence,
    userTranscript,
  });
};

/**
 * Evaluate user-created sentence via Edge Function
 */
export const evaluateUserSentence = async (
  word: string,
  userSentence: string,
  context: string
) => {
  return await postGemini({
    action: 'evaluateUserSentence',
    word,
    userSentence,
    context,
  });
};

/**
 * Translate English to Chinese via Edge Function
 */
export const translateToChinese = async (sentence: string): Promise<string> => {
  const data = await postGemini({
    action: 'translateToChinese',
    sentence,
  });
  if (!data || typeof data.translation !== 'string') {
    throw new Error('Invalid translation response');
  }
  return data.translation;
};
