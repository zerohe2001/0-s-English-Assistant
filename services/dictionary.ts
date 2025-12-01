
import { DictionaryEntry } from '../types';

const API_URL = 'https://api.dictionaryapi.dev/api/v2/entries/en';

export const fetchWordDefinition = async (word: string): Promise<DictionaryEntry | null> => {
  try {
    // Clean the word (remove punctuation)
    const cleanWord = word.replace(/[^\w\s]|_/g, "").trim();
    if (!cleanWord) return null;

    const response = await fetch(`${API_URL}/${cleanWord}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Word not found
      }
      throw new Error('Network response was not ok');
    }

    const data = await response.json();
    // API returns an array of entries, we usually want the first one
    return data[0] as DictionaryEntry;
  } catch (error) {
    console.error("Dictionary fetch error:", error);
    return null;
  }
};
