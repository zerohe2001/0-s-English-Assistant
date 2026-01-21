/**
 * Text-to-Speech service using OpenAI TTS
 * Industry-leading natural voices with excellent pronunciation
 * Fast (200ms latency), highly realistic, reliable
 */

/**
 * Speak text using OpenAI TTS
 * @param text - Text to speak
 * @param voiceName - Voice name (default: 'nova')
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
    console.log('🎤 Using OpenAI TTS for:', text.substring(0, 50));

    // Call our OpenAI TTS API endpoint
    const apiUrl = `/api/openai-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceName)}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI TTS API failed:', response.status, errorText);
      throw new Error(`TTS API failed: ${response.status}`);
    }

    // Get audio blob (MP3 format)
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Play using HTML5 Audio element
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);

      // ✅ Standardize volume to 0.85 (85%) for consistent playback
      audio.volume = 0.85;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log('✅ OpenAI TTS playback completed');
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
 * This fetches and caches audio in the background
 * Called when user clicks Start to preload all audio for instant playback
 */
export async function preloadAudio(text: string, voiceName: string = 'nova'): Promise<void> {
  try {
    console.log('🔄 Preloading audio for:', text.substring(0, 30));

    // Fetch audio from OpenAI TTS (browser will cache it automatically)
    const apiUrl = `/api/openai-tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceName)}`;
    const response = await fetch(apiUrl);

    if (response.ok) {
      // Just fetching is enough - browser HTTP cache will handle the rest
      await response.blob();
      console.log('✅ Audio preloaded successfully for:', text.substring(0, 30));
    } else {
      console.warn('⚠️ Preload failed (non-critical):', response.status);
    }
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
