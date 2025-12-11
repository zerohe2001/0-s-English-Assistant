
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, ChatMessage } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-2.5-flash";

export const generateWordExplanation = async (
  word: string,
  profile: UserProfile,
  context: string
) => {
  const prompt = `
  You are an expert English tutor.

  User Profile:
  Name: ${profile.name}
  City: ${profile.city}
  Job: ${profile.occupation}
  Hobbies: ${profile.hobbies}

  Today's Context: ${context}

  Task: Explain the word "${word}" and create a personalized example sentence.

  Requirements:
  1. "meaning": Simple English definition (CEFR B1 level).
  2. "phonetic": American English phonetic transcription in IPA format (e.g., /prəˌkræstɪˈneɪʃn/).
  3. "example": A VERY SHORT, CONVERSATIONAL sentence (max 8-12 words) using "${word}". It MUST sound like something spoken in real life, not a textbook sentence.
  4. "exampleTranslation": The Chinese (中文) translation of the example sentence.
     - MUST be in Chinese (中文), not English
     - MUST contain at least 2 Chinese characters (汉字)
     - Do NOT return: punctuation only (., ?, !), symbols (°, ×, ÷), or English text
     - Example valid: "我需要买些日用品。" ✓
     - Example invalid: "." ✗   "°" ✗   "..." ✗
  `;

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

  // ✅ FIX: Proper error handling for empty responses
  const data = JSON.parse(response.text || "null");
  if (!data || !data.meaning || !data.phonetic || !data.example || !data.exampleTranslation) {
    throw new Error('Invalid response from AI: missing required fields');
  }

  // ✅ FIX: Validate translation quality - must contain Chinese characters
  const translation = data.exampleTranslation.trim();
  console.log('🔍 [Gemini] Translation before validation:', JSON.stringify(translation));

  // Primary check: MUST contain Chinese characters
  if (!/[\u4e00-\u9fa5]/.test(translation)) {
    console.warn('⚠️ [Gemini] Translation invalid (no Chinese):', JSON.stringify(translation));
    data.exampleTranslation = '（翻译失败，请重新生成）';
  }
  // Secondary check: If it's too short (< 2 chars), likely invalid
  else if (translation.length < 2) {
    console.warn('⚠️ [Gemini] Translation too short:', JSON.stringify(translation));
    data.exampleTranslation = '（翻译失败，请重新生成）';
  }
  // Tertiary check: If it's just punctuation or symbols
  else if (/^[^\u4e00-\u9fa5a-zA-Z]+$/.test(translation)) {
    console.warn('⚠️ [Gemini] Translation is only symbols:', JSON.stringify(translation));
    data.exampleTranslation = '（翻译失败，请重新生成）';
  }

  console.log('✅ [Gemini] Final validated translation:', JSON.stringify(data.exampleTranslation));
  return data;
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
  const prompt = `Translate the following English sentence to Chinese:
"${sentence}"

Requirements:
1. Provide a natural, accurate Chinese translation
2. Output ONLY the Chinese translation, nothing else`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "text/plain",
    }
  });

  const translation = response.text?.trim() || '';
  if (!translation) {
    throw new Error('Empty translation received');
  }

  // Validate it contains Chinese characters
  if (!/[\u4e00-\u9fa5]/.test(translation)) {
    throw new Error('Translation does not contain Chinese characters');
  }

  return translation;
};
