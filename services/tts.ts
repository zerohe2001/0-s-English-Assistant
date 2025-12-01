import { GoogleGenAI } from '@google/genai';

// Audio cache: text -> base64 audio data
const audioCache = new Map<string, string>();

// ✅ Singleton AudioContext to avoid browser limit (max 6 contexts)
let globalAudioContext: AudioContext | null = null;

/**
 * Generate natural-sounding speech using Gemini TTS API
 * @param text - The text to convert to speech
 * @param voiceName - Voice name (default: 'Kore' - firm and confident)
 * @returns Base64 encoded audio data
 */
export async function generateSpeech(text: string, voiceName: string = 'Kore'): Promise<string> {
  // Check cache first
  const cacheKey = `${voiceName}:${text}`;
  if (audioCache.has(cacheKey)) {
    console.log('🎯 Using cached audio for:', text.substring(0, 50));
    return audioCache.get(cacheKey)!;
  }

  try {
    console.log('🎤 Generating new audio for:', text.substring(0, 50));
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          }
        }
      }
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioData) {
      throw new Error('No audio data received from Gemini TTS');
    }

    // Cache the result
    audioCache.set(cacheKey, audioData);
    console.log('✅ Audio cached. Cache size:', audioCache.size);

    return audioData;
  } catch (error) {
    console.error('Gemini TTS error:', error);
    throw error;
  }
}

/**
 * Preload audio for a text (non-blocking)
 * This generates and caches audio in the background
 */
export async function preloadAudio(text: string, voiceName: string = 'Kore'): Promise<void> {
  const cacheKey = `${voiceName}:${text}`;

  // Skip if already cached
  if (audioCache.has(cacheKey)) {
    return;
  }

  // Generate in background (don't await)
  generateSpeech(text, voiceName).catch(err => {
    console.warn('Preload audio failed (non-critical):', err);
  });
}

/**
 * Play audio from base64 PCM data
 * Audio format: PCM, 24000 Hz, 16-bit, mono
 */
export async function playAudioFromBase64(base64Audio: string): Promise<void> {
  try {
    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to Int16Array (PCM 16-bit)
    const int16Array = new Int16Array(bytes.buffer);

    // Convert Int16 to Float32 for Web Audio API
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0; // Normalize to -1.0 to 1.0
    }

    // ✅ Reuse singleton AudioContext instead of creating new one each time
    if (!globalAudioContext || globalAudioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      globalAudioContext = new AudioContextClass();
    }

    const audioBuffer = globalAudioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);

    // Create source and play
    const source = globalAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(globalAudioContext.destination);
    source.start(0);

    // Return a promise that resolves when audio finishes
    // ✅ Don't close the context - reuse it for next playback
    return new Promise((resolve) => {
      source.onended = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Error playing audio:', error);
    throw error;
  }
}

/**
 * High-level function: Generate and play speech
 * @param text - Text to speak
 * @param voiceName - Voice option (default: 'Kore')
 */
export async function speak(text: string, voiceName: string = 'Kore'): Promise<void> {
  try {
    const audioData = await generateSpeech(text, voiceName);
    await playAudioFromBase64(audioData);
  } catch (error) {
    console.error('Speech generation failed:', error);
    // Fallback to browser TTS
    fallbackToSpeechSynthesis(text);
  }
}

/**
 * Fallback to browser's speechSynthesis if Gemini TTS fails
 */
function fallbackToSpeechSynthesis(text: string): void {
  console.warn('Using fallback speechSynthesis');
  window.speechSynthesis.cancel();

  setTimeout(() => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  }, 100);
}

// Available voice options
export const VOICE_OPTIONS = {
  KORE: 'Kore',           // Firm and confident
  PUCK: 'Puck',           // Cheerful
  CHARON: 'Charon',       // Informative
  ENCELADUS: 'Enceladus', // Breathy
  GANYMEDE: 'Ganymede',   // Warm
  TITAN: 'Titan',         // Energetic
} as const;
