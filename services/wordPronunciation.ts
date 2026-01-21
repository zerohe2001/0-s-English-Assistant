/**
 * Word Pronunciation Service using Free Dictionary API
 * Provides authentic native speaker pronunciation for English words
 * Falls back to TTS if dictionary audio is unavailable
 */

import { audioCache } from './audioCache';
import { speak } from './tts';

interface DictionaryPhonetic {
  text: string;
  audio: string;
}

interface DictionaryEntry {
  word: string;
  phonetic?: string;
  phonetics: DictionaryPhonetic[];
  meanings: any[];
}

/**
 * Generate cache key for word audio
 */
function getWordAudioCacheKey(word: string): string {
  return `word-audio-${word.toLowerCase()}`;
}

/**
 * Fetch word data from Free Dictionary API
 */
async function fetchWordFromDictionary(word: string): Promise<DictionaryEntry | null> {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);

    if (!response.ok) {
      console.warn(`⚠️ Dictionary API failed for "${word}":`, response.status);
      return null;
    }

    const data = await response.json();
    return data[0]; // Return first entry
  } catch (error) {
    console.warn(`⚠️ Dictionary API error for "${word}":`, error);
    return null;
  }
}

/**
 * Get US pronunciation audio URL from dictionary entry
 * Prioritizes US pronunciation, falls back to any available audio
 */
function getUsAudioUrl(entry: DictionaryEntry): string | null {
  // First, try to find US pronunciation (contains "-us" or "-US" in filename)
  const usAudio = entry.phonetics.find(p =>
    p.audio && (p.audio.includes('-us.mp3') || p.audio.includes('-US.mp3'))
  );

  if (usAudio?.audio) {
    console.log(`✅ Found US pronunciation for "${entry.word}"`);
    return usAudio.audio;
  }

  // Fallback: use any available audio
  const anyAudio = entry.phonetics.find(p => p.audio);
  if (anyAudio?.audio) {
    console.log(`✅ Found pronunciation for "${entry.word}" (not specifically US)`);
    return anyAudio.audio;
  }

  return null;
}

/**
 * Fetch audio file and convert to Blob
 */
async function fetchAudioBlob(audioUrl: string): Promise<Blob> {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }
  return await response.blob();
}

/**
 * Play word pronunciation with authentic native speaker audio
 *
 * Strategy:
 * 1. Check IndexedDB cache for word audio
 * 2. If not cached, fetch from Free Dictionary API (prefers US pronunciation)
 * 3. If dictionary has audio, download and cache it
 * 4. If no dictionary audio, fallback to OpenAI TTS
 * 5. Play the audio
 *
 * @param word - The word to pronounce
 */
export async function speakWord(word: string): Promise<void> {
  try {
    const cacheKey = getWordAudioCacheKey(word);

    // Try to get from IndexedDB cache first
    let audioBlob = await audioCache.getAudio(cacheKey);

    if (audioBlob) {
      console.log(`🎵 Playing word from cache: "${word}"`);
    } else {
      // Not in cache, fetch from dictionary
      console.log(`🔍 Fetching pronunciation for: "${word}"`);
      const entry = await fetchWordFromDictionary(word);

      if (entry) {
        const audioUrl = getUsAudioUrl(entry);

        if (audioUrl) {
          // Download audio from dictionary
          console.log(`📥 Downloading dictionary audio for: "${word}"`);
          audioBlob = await fetchAudioBlob(audioUrl);

          // Save to cache for future use (non-blocking)
          audioCache.saveAudio(cacheKey, audioBlob).catch(err => {
            console.warn('⚠️ Failed to cache word audio (non-critical):', err);
          });
        } else {
          console.warn(`⚠️ No audio available in dictionary for "${word}", using TTS fallback`);
          // Fallback to TTS for words without dictionary audio
          return speak(word);
        }
      } else {
        console.warn(`⚠️ Word "${word}" not found in dictionary, using TTS fallback`);
        // Fallback to TTS if word not in dictionary
        return speak(word);
      }
    }

    // Play audio
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);

      return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.volume = 0.85;

        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          console.log(`✅ Word pronunciation completed: "${word}"`);
          resolve();
        };

        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl);
          console.error(`❌ Audio playback failed for "${word}":`, e);
          reject(new Error('Audio playback failed'));
        };

        audio.play().catch(reject);
      });
    }
  } catch (error) {
    console.error(`❌ Word pronunciation failed for "${word}":`, error);
    // Final fallback to TTS
    return speak(word);
  }
}

/**
 * Preload word pronunciation audio (non-blocking)
 * Useful for preloading vocabulary before learning sessions
 */
export async function preloadWordAudio(word: string): Promise<void> {
  try {
    const cacheKey = getWordAudioCacheKey(word);

    // Check if already cached
    const cached = await audioCache.getAudio(cacheKey);
    if (cached) {
      console.log(`✅ Word audio already cached: "${word}"`);
      return;
    }

    // Fetch from dictionary
    const entry = await fetchWordFromDictionary(word);
    if (!entry) {
      console.log(`⚠️ Word "${word}" not in dictionary, skipping preload`);
      return;
    }

    const audioUrl = getUsAudioUrl(entry);
    if (!audioUrl) {
      console.log(`⚠️ No audio for "${word}" in dictionary, skipping preload`);
      return;
    }

    // Download and cache
    const audioBlob = await fetchAudioBlob(audioUrl);
    await audioCache.saveAudio(cacheKey, audioBlob);
    console.log(`✅ Word audio preloaded and cached: "${word}"`);
  } catch (error) {
    console.warn(`⚠️ Preload word audio failed for "${word}" (non-critical):`, error);
  }
}
