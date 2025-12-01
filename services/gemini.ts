
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
  4. "exampleTranslation": The Chinese translation of the example sentence.
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

export const generateConversationScene = async (
  profile: UserProfile,
  context: string,
  words: string[]
) => {
  const prompt = `
  Create a roleplay scenario based on:
  User: ${profile.name} (${profile.occupation} in ${profile.city})
  Activity: ${context}
  Target Words: ${words.join(', ')}

  Output a short paragraph describing the scene and who the AI should play.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
  });

  // ✅ FIX: Check for empty response
  if (!response.text || response.text.trim().length === 0) {
    throw new Error('No conversation scene generated');
  }
  return response.text;
};

export const generateSessionSummary = async (
    history: ChatMessage[],
    targetWords: string[]
) => {
    const transcript = history.map(h => `${h.role}: ${h.text}`).join('\n');

    const prompt = `
    Analyze this roleplay conversation transcript.
    Target Words: ${targetWords.join(', ')}

    Transcript:
    ${transcript}

    Task:
    1. Identify which target words were used correctly by the user.
    2. Identify which words were missed or unused.
    3. Provide overall feedback on the conversation (fluency, vocabulary usage).
    `;

    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    usedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    missedWords: { type: Type.ARRAY, items: { type: Type.STRING } },
                    feedback: { type: Type.STRING }
                },
                required: ["usedWords", "missedWords", "feedback"]
            }
        }
    });

    // ✅ FIX: Proper error handling
    const data = JSON.parse(response.text || "null");
    if (!data || !Array.isArray(data.usedWords) || !Array.isArray(data.missedWords) || !data.feedback) {
      throw new Error('Invalid session summary response');
    }
    return data;
}
