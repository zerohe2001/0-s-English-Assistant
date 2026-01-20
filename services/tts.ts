/**
 * Text-to-Speech service using Microsoft Edge TTS
 * Completely replaces Gemini TTS for better quality and mobile compatibility
 */

/**
 * Speak text using Microsoft Edge TTS API
 * @param text - Text to speak
 * @param voiceName - Voice name (default: 'en-US-AvaMultilingualNeural')
 */
export async function speak(text: string, voiceName: string = 'en-US-AvaNeural'): Promise<void> {
  try {
    console.log('🎤 Trying Edge TTS API (faster voice) for:', text.substring(0, 50));

    // Use simpler/faster voice to avoid timeout
    // Changed from: en-US-AvaMultilingualNeural (slow, high quality)
    // To: en-US-AvaNeural (faster, still good quality)
    const apiUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=en-US-AvaNeural`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(`TTS API failed: ${response.status} ${response.statusText}`);
    }

    // Get audio blob (MP3 format)
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    // Play using HTML5 Audio element (best mobile compatibility)
    return new Promise((resolve, reject) => {
      const audio = new Audio(audioUrl);

      // ✅ Standardize volume to 0.85 (85%) for consistent playback
      audio.volume = 0.85;

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        console.log('✅ Edge TTS playback completed');
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
    console.error('❌ Edge TTS failed, using browser fallback:', error);
    return fallbackToSpeechSynthesis(text);
  }
}

/**
 * Preload audio for a text (non-blocking)
 * This fetches and caches audio in the background
 */
export async function preloadAudio(text: string, voiceName: string = 'en-US-AvaMultilingualNeural'): Promise<void> {
  try {
    console.log('🔄 Preloading audio for:', text.substring(0, 30));

    // Fetch audio (browser will cache it automatically)
    const apiUrl = `/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voiceName)}`;
    const response = await fetch(apiUrl);

    if (response.ok) {
      // Just fetching is enough - browser HTTP cache will handle the rest
      await response.blob();
      console.log('✅ Audio preloaded successfully');
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
