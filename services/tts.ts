/**
 * Text-to-Speech service using OpenAI TTS with IndexedDB caching
 * Industry-leading natural voices with excellent pronunciation
 * Fast (200ms latency), highly realistic, reliable
 * Audio is permanently cached in IndexedDB for instant replay
 */

import { audioCache } from './audioCache';

/**
 * Generate cache key for text + voice combination
 */
function getCacheKey(text: string, voiceName: string): string {
  return `tts-${voiceName}-${text}`;
}

/**
 * Fetch audio from OpenAI TTS API
 */
async function fetchAudioFromAPI(text: string, voiceName: string): Promise<Blob> {
  const apiUrl = `/api/openai-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceName)}`;
  const response = await fetch(apiUrl);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ OpenAI TTS API failed:', response.status, errorText);
    throw new Error(`TTS API failed: ${response.status}`);
  }

  return await response.blob();
}

/**
 * Speak text using OpenAI TTS with IndexedDB caching
 * @param text - Text to speak
 * @param voiceName - Voice name (default: 'nova')
 *
 * Caching strategy:
 * 1. Check IndexedDB cache first (instant if found)
 * 2. If not cached, fetch from OpenAI TTS API
 * 3. Save to IndexedDB for future use (permanent storage)
 *
 * Voice history:
 * - Edge TTS: Timed out (>60s) on Vercel
 * - Google Cloud TTS: API key permission issues, less natural
 * - OpenAI TTS: Fast, most realistic, simple setup ✅
 *
 * Available voices:
 * - nova: Female, warm and natural (default - most human-like)
 * - alloy: Neutral and balanced
 * - echo: Male, warm and engaging
 * - shimmer: Female, bright and energetic
 */
export async function speak(text: string, voiceName: string = 'nova'): Promise<void> {
  try {
    const cacheKey = getCacheKey(text, voiceName);

    // Try to get from IndexedDB cache first
    let audioBlob = await audioCache.getAudio(cacheKey);

    if (audioBlob) {
      console.log('🎵 Playing from cache:', text.substring(0, 50));
    } else {
      // Not in cache, fetch from API
      console.log('🎤 Fetching from OpenAI TTS:', text.substring(0, 50));
      audioBlob = await fetchAudioFromAPI(text, voiceName);

      // Save to cache for future use (non-blocking)
      audioCache.saveAudio(cacheKey, audioBlob).catch(err => {
        console.warn('⚠️ Failed to cache audio (non-critical):', err);
      });
    }

    // Play audio
    const audioUrl = URL.createObjectURL(audioBlob);

    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);

      // ✅ Standardize volume to 0.85 (85%) for consistent playback
      audio.volume = 0.85;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log('✅ TTS playback completed');
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        console.error('❌ Audio playback failed:', e);
        reject(new Error('Audio playback failed'));
      };

      audio.play().catch(reject);
    });
  } catch (error) {
    console.error('❌ OpenAI TTS failed, using browser fallback:', error);
    return fallbackToSpeechSynthesis(text);
  }
}

/**
 * Preload audio for a text (non-blocking)
 * Fetches from API and saves to IndexedDB cache for instant playback
 * Called when user clicks Start to preload all audio
 */
export async function preloadAudio(text: string, voiceName: string = 'nova'): Promise<void> {
  try {
    const cacheKey = getCacheKey(text, voiceName);

    // Check if already in cache
    const cached = await audioCache.getAudio(cacheKey);
    if (cached) {
      console.log('✅ Already cached:', text.substring(0, 30));
      return;
    }

    // Not in cache, fetch from API
    console.log('🔄 Preloading audio for:', text.substring(0, 30));
    const audioBlob = await fetchAudioFromAPI(text, voiceName);

    // Save to IndexedDB cache
    await audioCache.saveAudio(cacheKey, audioBlob);
    console.log('✅ Audio preloaded and cached:', text.substring(0, 30));
  } catch (error) {
    // Preload failures are non-critical, just log
    console.warn('⚠️ Preload audio failed (non-critical):', error);
  }
}

/**
 * Fallback to browser's speechSynthesis if Edge TTS fails
 */
function fallbackToSpeechSynthesis(text: string): Promise<void> {
  return new Promise((resolve) => {
    console.warn('⚠️ Using fallback speechSynthesis');
    window.speechSynthesis.cancel();

    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve(); // Don't reject, just resolve
      window.speechSynthesis.speak(utterance);
    }, 100);
  });
}

// Available voice options (Microsoft Edge TTS)
export const VOICE_OPTIONS = {
  AVA: 'en-US-AvaMultilingualNeural',       // Female, natural (default)
  EMMA: 'en-US-EmmaMultilingualNeural',     // Female, warm
  ANDREW: 'en-US-AndrewMultilingualNeural', // Male, natural
  BRIAN: 'en-US-BrianMultilingualNeural',   // Male, firm
  SONIA: 'en-GB-SoniaNeural',               // British Female
  RYAN: 'en-GB-RyanNeural',                 // British Male
} as const;
