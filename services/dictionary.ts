import { DictionaryEntry } from '../types';

// ✅ LocalStorage cache for instant lookups
const CACHE_KEY = 'dictionary-cache';
const CACHE_VERSION = 'v1';

interface CacheData {
  version: string;
  entries: { [word: string]: DictionaryEntry };
}

// Load cache from localStorage
const loadCache = (): CacheData => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return { version: CACHE_VERSION, entries: {} };

    const data: CacheData = JSON.parse(cached);
    if (data.version !== CACHE_VERSION) {
      console.log('🔄 Cache version mismatch, clearing...');
      return { version: CACHE_VERSION, entries: {} };
    }
    return data;
  } catch {
    return { version: CACHE_VERSION, entries: {} };
  }
};

// Save cache to localStorage
const saveCache = (cache: CacheData) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.warn('Failed to save dictionary cache:', e);
  }
};

// ✅ Use Free Dictionary API with instant local cache!
export const fetchWordDefinition = async (word: string): Promise<DictionaryEntry | null> => {
  try {
    const cleanWord = word.replace(/[^\w\s]|_/g, "").trim().toLowerCase();
    if (!cleanWord) return null;

    // 🚀 Check cache first - INSTANT!
    const cache = loadCache();
    if (cache.entries[cleanWord]) {
      console.log('⚡ Using cached definition for:', cleanWord);
      return cache.entries[cleanWord];
    }

    console.log('🔍 Fetching definition from API for:', cleanWord);

    // Free Dictionary API: https://dictionaryapi.dev/
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);

    if (!response.ok) {
      console.log('❌ Word not found in dictionary');
      return null;
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const entry = data[0];

    // Transform API response to our DictionaryEntry format
    const meanings = entry.meanings?.map((meaning: any) => ({
      partOfSpeech: meaning.partOfSpeech || 'unknown',
      definitions: meaning.definitions?.slice(0, 3).map((def: any) => ({
        definitionEN: def.definition || '',
        definitionCN: '', // No Chinese translation from free API
      })) || []
    })) || [];

    const result: DictionaryEntry = {
      word: entry.word || cleanWord,
      phonetic: entry.phonetic || entry.phonetics?.[0]?.text || '',
      meanings: meanings
    };

    // 💾 Save to cache for next time
    cache.entries[cleanWord] = result;
    saveCache(cache);
    console.log('✅ Definition fetched and cached');

    return result;

  } catch (error) {
    console.error("Dictionary fetch error:", error);
    return null;
  }
};
