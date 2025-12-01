
import { GoogleGenAI, Type } from "@google/genai";
import { DictionaryEntry } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

export const fetchWordDefinition = async (word: string): Promise<DictionaryEntry | null> => {
  try {
    const cleanWord = word.replace(/[^\w\s]|_/g, "").trim();
    if (!cleanWord) return null;

    const prompt = `
    Provide a dictionary definition for the English word: "${cleanWord}".
    
    Output JSON format requirements:
    1. phonetic: IPA pronunciation (e.g. /həˈləʊ/)
    2. meanings: Array of objects with 'partOfSpeech' (noun/verb/adj), 'definitionEN' (Simple English definition), and 'definitionCN' (Chinese translation of the definition).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: { type: Type.STRING },
            phonetic: { type: Type.STRING },
            meanings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  partOfSpeech: { type: Type.STRING },
                  definitionEN: { type: Type.STRING },
                  definitionCN: { type: Type.STRING },
                },
                required: ["partOfSpeech", "definitionEN", "definitionCN"],
              },
            },
          },
          required: ["word", "phonetic", "meanings"],
        },
      },
    });

    const data = JSON.parse(response.text || "null");
    return data as DictionaryEntry;
  } catch (error) {
    console.error("Dictionary fetch error:", error);
    return null;
  }
};
