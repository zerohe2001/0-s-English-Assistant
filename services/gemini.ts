
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

/**
 * Validate if translation contains proper Chinese content
 */
const isValidTranslation = (translation: string): boolean => {
  const trimmed = translation.trim();

  // Must contain Chinese characters
  if (!/[\u4e00-\u9fa5]/.test(trimmed)) {
    return false;
  }

  // Must be at least 2 characters
  if (trimmed.length < 2) {
    return false;
  }

  // Must not be only symbols/punctuation
  if (/^[^\u4e00-\u9fa5a-zA-Z]+$/.test(trimmed)) {
    return false;
  }

  return true;
};

export const generateWordExplanation = async (
  word: string,
  profile: UserProfile,
  context: string
) => {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    console.log(`🔄 [Gemini] Attempt ${attempt}/${maxRetries + 1} for word: ${word}`);

    const prompt = `
  You are an expert English tutor specializing in creating personalized learning content.

  User Profile:
  Name: ${profile.name}
  City: ${profile.city}
  Job: ${profile.occupation}
  Hobbies: ${profile.hobbies}

  Today's Context: ${context}

  Task: Explain the word "${word}" and create a personalized example sentence.

  CRITICAL Requirements for exampleTranslation:
  ⚠️ EXTREMELY IMPORTANT: The "exampleTranslation" field MUST be a complete Chinese sentence.

  ✅ CORRECT examples:
  - "我今天需要买些日用品。" ✓
  - "他经常拖延工作。" ✓
  - "这个周末我想去远足。" ✓

  ❌ FORBIDDEN - These will cause the app to FAIL:
  - "." ✗ (only punctuation)
  - "°" ✗ (only symbols)
  - "..." ✗ (only dots)
  - "" ✗ (empty string)
  - "translation" ✗ (English word)

  Requirements for ALL fields:
  1. "meaning": Simple English definition (CEFR B1 level, 5-15 words).
  2. "phonetic": American English IPA format (e.g., /prəˌkræstɪˈneɪʃn/).
  3. "example": SHORT, CONVERSATIONAL sentence (max 12 words) using "${word}".
  4. "exampleTranslation":
     - MUST be a COMPLETE Chinese (中文) sentence
     - MUST be 4-20 Chinese characters long
     - MUST contain actual Chinese characters (汉字), not symbols or English
     - MUST be a natural, fluent translation of the example sentence
     - Think: "What would a native Chinese speaker say?"
  `;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              meaning: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              example: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING },
            },
            required: ["meaning", "phonetic", "example", "exampleTranslation"],
          },
        },
      });

      // ✅ Parse and validate response
      const data = JSON.parse(response.text || "null");
      if (!data || !data.meaning || !data.phonetic || !data.example || !data.exampleTranslation) {
        console.error(`❌ [Gemini] Attempt ${attempt}: Missing required fields`);
        if (attempt > maxRetries) {
          throw new Error('Invalid response from AI: missing required fields');
        }
        continue; // Retry
      }

      // ✅ Validate translation quality
      const translation = data.exampleTranslation.trim();
      console.log(`🔍 [Gemini] Attempt ${attempt} translation:`, JSON.stringify(translation));

      if (isValidTranslation(translation)) {
        console.log(`✅ [Gemini] Success on attempt ${attempt}! Translation:`, JSON.stringify(translation));
        return data;
      } else {
        console.warn(`⚠️ [Gemini] Attempt ${attempt} failed validation:`, JSON.stringify(translation));

        if (attempt > maxRetries) {
          // Last attempt failed, return with fallback message
          console.error(`❌ [Gemini] All ${maxRetries + 1} attempts failed for word: ${word}`);
          data.exampleTranslation = '（翻译生成失败，请重试）';
          return data;
        }

        // Retry with next attempt
        console.log(`🔄 [Gemini] Retrying... (${attempt}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
        continue;
      }
    } catch (error) {
      console.error(`❌ [Gemini] Attempt ${attempt} error:`, error);

      if (attempt > maxRetries) {
        throw error;
      }

      // Retry
      console.log(`🔄 [Gemini] Retrying after error... (${attempt}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
  }

  // Should never reach here due to the loop logic
  throw new Error('Failed to generate word explanation after retries');
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

export const evaluateShadowing = async (
  targetSentence: string,
  userTranscript: string
) => {
    const prompt = `
    Task: Evaluate if the student's pronunciation (transcribed text) matches the target sentence.
    Target: "${targetSentence}"
    User Said: "${userTranscript}"

    Requirements:
    1. Ignore minor punctuation or casing.
    2. Allow for minor speech-to-text errors (e.g. homophones).
    3. Return isCorrect: true if it's mostly accurate.
    4. Provide brief feedback.
    `;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    isCorrect: { type: Type.BOOLEAN },
                    feedback: { type: Type.STRING }
                },
                required: ["isCorrect", "feedback"]
            }
        }
    });

    // ✅ FIX: Proper error handling
    const data = JSON.parse(response.text || "null");
    if (!data || typeof data.isCorrect !== 'boolean' || !data.feedback) {
      throw new Error('Invalid shadowing evaluation response');
    }
    return data;
}

export const evaluateUserSentence = async (
  word: string,
  userSentence: string,
  context: string
) => {
  const prompt = `
  Task: Evaluate the student's sentence using the target word "${word}".
  Context: ${context}
  Student Sentence: "${userSentence}"

  Requirements:
  1. Check if the word is used correctly.
  2. Check for major grammar errors.
  3. Provide a "betterWay" to say it (more natural/native) if applicable, otherwise repeat the corrected version.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          isCorrect: { type: Type.BOOLEAN },
          feedback: { type: Type.STRING },
          betterWay: { type: Type.STRING },
        },
        required: ["isCorrect", "feedback", "betterWay"],
      },
    },
  });

  // ✅ FIX: Proper error handling
  const data = JSON.parse(response.text || "null");
  if (!data || typeof data.isCorrect !== 'boolean' || !data.feedback || !data.betterWay) {
    throw new Error('Invalid sentence evaluation response');
  }
  return data;
};


/**
 * Generate conversation questions based on user's created sentences
 * Returns 3 questions that extend the topics mentioned in user sentences
 */
export const generateConversationQuestions = async (
  userSentences: { word: string; sentence: string }[],
  profile: UserProfile,
  context: string
): Promise<string[]> => {
  const sentenceList = userSentences
    .map((s, i) => `${i + 1}. "${s.sentence}" (using word: ${s.word})`)
    .join('\n');

  const prompt = `
You are an English conversation teacher.

User Profile:
- Name: ${profile.name}
- City: ${profile.city}
- Occupation: ${profile.occupation}
- Today's Context: ${context}

The user just created these sentences using new vocabulary:
${sentenceList}

Task: Generate EXACTLY 3 engaging follow-up questions based on the topics mentioned in their sentences.

Requirements:
1. Questions should be conversational and natural
2. Each question should relate to at least one of their sentences
3. Questions should encourage the user to use the vocabulary words naturally
4. Keep questions simple (max 15 words each)
5. Make questions personally relevant to their context

Output format: Return ONLY a JSON array of 3 question strings.
Example: ["What strategies help you avoid procrastination?", "How do you manage deadlines?", "What's your biggest time management challenge?"]
`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      },
    },
  });

  const questions = JSON.parse(response.text || "[]");
  if (!Array.isArray(questions) || questions.length !== 3) {
    throw new Error('Invalid questions response: expected array of 3 strings');
  }

  return questions;
};

/**
 * Correct user's text answer and provide feedback (with streaming support)
 */
export const correctUserAnswer = async (
  question: string,
  userAnswer: string,
  onStream?: (chunk: string) => void
): Promise<{ correctedText: string; feedback: string; hasErrors: boolean }> => {
  const prompt = `
You are an English grammar teacher.

Question: "${question}"
User's Answer: "${userAnswer}"

Task: Check the user's answer for grammar, spelling, and naturalness.

Requirements:
1. Provide a corrected version (even if no changes needed)
2. Give brief, encouraging feedback highlighting what was good and what to improve
3. Indicate if there were any errors

Output JSON format:
{
  "correctedText": "The corrected version of their answer",
  "feedback": "Brief feedback (2-3 sentences max)",
  "hasErrors": true or false
}
`;

  // ✅ Use streaming if callback provided
  if (onStream) {
    const response = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            correctedText: { type: Type.STRING },
            feedback: { type: Type.STRING },
            hasErrors: { type: Type.BOOLEAN }
          },
          required: ["correctedText", "feedback", "hasErrors"]
        },
      },
    });

    let fullText = '';
    for await (const chunk of response) {
      const chunkText = chunk.text || '';
      fullText += chunkText;
      onStream(chunkText); // ✅ Stream each chunk to UI
    }

    // ✅ FIX: Add try/catch for JSON parsing in case of incomplete stream
    let data;
    try {
      data = JSON.parse(fullText || "null");
    } catch (parseError) {
      console.error('❌ JSON parse error in streaming response:', parseError);
      console.error('Raw response:', fullText);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    if (!data || !data.correctedText || !data.feedback || typeof data.hasErrors !== 'boolean') {
      throw new Error('Invalid correction response');
    }
    return data;
  }

  // Non-streaming fallback
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          correctedText: { type: Type.STRING },
          feedback: { type: Type.STRING },
          hasErrors: { type: Type.BOOLEAN }
        },
        required: ["correctedText", "feedback", "hasErrors"]
      },
    },
  });

  const data = JSON.parse(response.text || "null");
  if (!data || !data.correctedText || !data.feedback || typeof data.hasErrors !== 'boolean') {
    throw new Error('Invalid correction response');
  }

  return data;
};

export const translateToChinese = async (sentence: string): Promise<string> => {
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    console.log(`🔄 [translateToChinese] Attempt ${attempt}/${maxRetries + 1} for: "${sentence.substring(0, 30)}..."`);

    const prompt = `Translate this English sentence to natural Chinese (中文):

"${sentence}"

⚠️ CRITICAL Requirements:
1. Output MUST be in Chinese (中文), not English
2. Output MUST contain at least 4 Chinese characters (汉字)
3. Translate naturally and conversationally
4. Output ONLY the Chinese translation

❌ FORBIDDEN outputs (will cause FAILURE):
- Punctuation only: "." "?" "°" ✗
- Symbols or numbers only ✗
- English text ✗
- Empty responses ✗

✅ CORRECT example:
Input: "I need to buy some groceries today."
Output: 我今天需要买些日用品。`;

    try {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
          responseMimeType: "text/plain",
        }
      });

      const translation = response.text?.trim() || '';
      console.log(`🔍 [translateToChinese] Attempt ${attempt} result:`, JSON.stringify(translation));

      if (isValidTranslation(translation)) {
        console.log(`✅ [translateToChinese] Success on attempt ${attempt}!`);
        return translation;
      } else {
        console.warn(`⚠️ [translateToChinese] Attempt ${attempt} failed validation`);

        if (attempt > maxRetries) {
          console.error(`❌ [translateToChinese] All ${maxRetries + 1} attempts failed`);
          return '（翻译失败，请重试）';
        }

        // Retry
        console.log(`🔄 [translateToChinese] Retrying... (${attempt}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
    } catch (error) {
      console.error(`❌ [translateToChinese] Attempt ${attempt} error:`, error);

      if (attempt > maxRetries) {
        return '（翻译失败，请重试）';
      }

      // Retry
      console.log(`🔄 [translateToChinese] Retrying after error...`);
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
  }

  // Should never reach here
  return '（翻译失败，请重试）';
};
