import { GoogleGenAI, Type } from "@google/genai";
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function for Gemini 2.5 Flash API calls
 *
 * POST request with JSON body:
 * {
 *   action: 'generateWordExplanation' | 'generateWordSentences' | 'evaluateShadowing' | 'evaluateUserSentence' | 'translateToChinese',
 *   ...params
 * }
 *
 * Returns: JSON response based on action
 *
 * Gemini API key must be set in API_KEY environment variable
 */

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API key
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      console.error('❌ API_KEY not configured');
      return res.status(500).json({
        error: 'Gemini API not configured',
        message: 'Please add API_KEY to environment variables'
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Parse request body
    const { action, ...params } = req.body;

    console.log(`🤖 [Gemini API] Action: ${action}`);

    switch (action) {
      case 'generateWordExplanation':
        return await handleGenerateWordExplanation(ai, params, res);

      case 'generateWordSentences':
        return await handleGenerateWordSentences(ai, params, res);

      case 'evaluateShadowing':
        return await handleEvaluateShadowing(ai, params, res);

      case 'evaluateUserSentence':
        return await handleEvaluateUserSentence(ai, params, res);

      case 'translateToChinese':
        return await handleTranslateToChinese(ai, params, res);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error: any) {
    console.error('❌ [Gemini API] Error:', error);
    res.status(500).json({
      error: 'Gemini API request failed',
      message: error.message
    });
  }
}

/**
 * Generate word explanation with personalized example
 */
async function handleGenerateWordExplanation(
  ai: GoogleGenAI,
  params: { word: string; profile: any; context: string },
  res: VercelResponse
) {
  const { word, profile, context } = params;
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    console.log(`🔄 [generateWordExplanation] Attempt ${attempt}/${maxRetries + 1} for: ${word}`);

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

      const data = JSON.parse(response.text || "null");
      if (!data || !data.meaning || !data.phonetic || !data.example || !data.exampleTranslation) {
        console.error(`❌ Attempt ${attempt}: Missing required fields`);
        if (attempt > maxRetries) {
          throw new Error('Invalid response from AI: missing required fields');
        }
        continue;
      }

      const translation = data.exampleTranslation.trim();
      console.log(`🔍 Attempt ${attempt} translation:`, JSON.stringify(translation));

      if (isValidTranslation(translation)) {
        console.log(`✅ Success on attempt ${attempt}!`);
        return res.status(200).json(data);
      } else {
        console.warn(`⚠️ Attempt ${attempt} failed validation`);

        if (attempt > maxRetries) {
          data.exampleTranslation = '（翻译生成失败，请重试）';
          return res.status(200).json(data);
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} error:`, error);
      if (attempt > maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
  }

  throw new Error('Failed to generate word explanation after retries');
}

/**
 * Generate 3 practice sentences with Chinese translations
 */
async function handleGenerateWordSentences(
  ai: GoogleGenAI,
  params: { word: string; profile: any; context: string },
  res: VercelResponse
) {
  const { word, profile, context } = params;
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    console.log(`🔄 [generateWordSentences] Attempt ${attempt}/${maxRetries + 1} for: ${word}`);

    const prompt = `
You are an expert English tutor.

User Profile:
Name: ${profile.name}
City: ${profile.city}
Job: ${profile.occupation}
Hobbies: ${profile.hobbies}

Today's Context: ${context}

Task: Create 3 SHORT, natural English sentences using the word "${word}".
For each sentence, provide a natural Chinese translation.

Requirements:
1. Each English sentence must be <= 12 words.
2. Each Chinese translation must be a full Chinese sentence (中文).
3. Output must be JSON only, with this shape:
{
  "sentences": [
    {"sentence": "...", "translation": "..."},
    {"sentence": "...", "translation": "..."},
    {"sentence": "...", "translation": "..."}
  ]
}
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
              sentences: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sentence: { type: Type.STRING },
                    translation: { type: Type.STRING },
                  },
                  required: ["sentence", "translation"],
                },
              },
            },
            required: ["sentences"],
          },
        },
      });

      const data = JSON.parse(response.text || "null");
      const sentences = Array.isArray(data?.sentences) ? data.sentences : [];

      if (sentences.length !== 3) {
        console.error(`❌ Attempt ${attempt}: Invalid sentence count`);
        if (attempt > maxRetries) {
          throw new Error('Invalid response from AI: missing sentences');
        }
        continue;
      }

      const cleaned = sentences.map((item: any) => ({
        sentence: (item?.sentence || '').trim(),
        translation: (item?.translation || '').trim(),
      }));

      const allValid = cleaned.every(s =>
        s.sentence && s.sentence.split(/\s+/).length <= 12 && isValidTranslation(s.translation)
      );

      if (allValid) {
        console.log(`✅ [generateWordSentences] Success on attempt ${attempt}!`);
        return res.status(200).json({ sentences: cleaned });
      }

      console.warn(`⚠️ [generateWordSentences] Validation failed on attempt ${attempt}`);
      if (attempt > maxRetries) {
        return res.status(200).json({
          sentences: cleaned.map(s => ({
            sentence: s.sentence || `I learned the word "${word}" today.`,
            translation: s.translation || '（翻译生成失败，请重试）'
          }))
        });
      }
    } catch (error) {
      console.error(`❌ [generateWordSentences] Attempt ${attempt} error:`, error);
      if (attempt > maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw new Error('Failed to generate word sentences after retries');
}

/**
 * Evaluate shadowing practice
 */
async function handleEvaluateShadowing(
  ai: GoogleGenAI,
  params: { targetSentence: string; userTranscript: string },
  res: VercelResponse
) {
  const { targetSentence, userTranscript } = params;

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

  const data = JSON.parse(response.text || "null");
  if (!data || typeof data.isCorrect !== 'boolean' || !data.feedback) {
    throw new Error('Invalid shadowing evaluation response');
  }

  return res.status(200).json(data);
}

/**
 * Evaluate user-created sentence
 */
async function handleEvaluateUserSentence(
  ai: GoogleGenAI,
  params: { word: string; userSentence: string; context: string },
  res: VercelResponse
) {
  const { word, userSentence, context } = params;

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

  const data = JSON.parse(response.text || "null");
  if (!data || typeof data.isCorrect !== 'boolean' || !data.feedback || !data.betterWay) {
    throw new Error('Invalid sentence evaluation response');
  }

  return res.status(200).json(data);
}

/**
 * Translate English to Chinese
 */
async function handleTranslateToChinese(
  ai: GoogleGenAI,
  params: { sentence: string },
  res: VercelResponse
) {
  const { sentence } = params;
  const maxRetries = 2;
  let attempt = 0;

  while (attempt <= maxRetries) {
    attempt++;
    console.log(`🔄 [translateToChinese] Attempt ${attempt}/${maxRetries + 1}`);

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
      console.log(`🔍 Attempt ${attempt} result:`, JSON.stringify(translation));

      if (isValidTranslation(translation)) {
        console.log(`✅ Success on attempt ${attempt}!`);
        return res.status(200).json({ translation });
      } else {
        console.warn(`⚠️ Attempt ${attempt} failed validation`);

        if (attempt > maxRetries) {
          return res.status(200).json({ translation: '（翻译失败，请重试）' });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }
    } catch (error) {
      console.error(`❌ Attempt ${attempt} error:`, error);

      if (attempt > maxRetries) {
        return res.status(200).json({ translation: '（翻译失败，请重试）' });
      }

      await new Promise(resolve => setTimeout(resolve, 500));
      continue;
    }
  }

  return res.status(200).json({ translation: '（翻译失败，请重试）' });
}
