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
    console.warn('⚠️ Preload audio failed (non-critical):', err);
  });
}

/**
 * Play audio from base64 PCM data
 * Audio format: PCM, 24000 Hz, 16-bit, mono
 * ✅ Uses HTML5 Audio for better mobile compatibility
 */
export async function playAudioFromBase64(base64Audio: string): Promise<void> {
  try {
    // Try HTML5 Audio first (better mobile support)
    return await playWithHtmlAudio(base64Audio);
  } catch (htmlError) {
    console.warn('HTML5 Audio failed, trying Web Audio API:', htmlError);
    // Fallback to Web Audio API
    return await playWithWebAudio(base64Audio);
  }
}

/**
 * Play audio using HTML5 Audio element (best mobile compatibility)
 */
async function playWithHtmlAudio(base64Audio: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Gemini TTS returns raw PCM, need to convert to WAV for HTML Audio
      const wavBlob = pcmToWav(base64Audio, 24000, 1, 16);
      const audioUrl = URL.createObjectURL(wavBlob);

      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl); // Clean up
        resolve();
      };

      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Audio playback failed'));
      };

      // ✅ Critical for mobile: play() returns a promise
      audio.play().catch(reject);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Convert PCM to WAV format
 */
function pcmToWav(base64Pcm: string, sampleRate: number, numChannels: number, bitsPerSample: number): Blob {
  // Decode base64 PCM data
  const binaryString = atob(base64Pcm);
  const pcmData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pcmData[i] = binaryString.charCodeAt(i);
  }

  const dataLength = pcmData.length;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // WAV header
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true); // byte rate
  view.setUint16(32, numChannels * bitsPerSample / 8, true); // block align
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  // Copy PCM data
  const uint8 = new Uint8Array(buffer);
  uint8.set(pcmData, 44);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Fallback: Play audio using Web Audio API
 */
async function playWithWebAudio(base64Audio: string): Promise<void> {
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

    // ✅ Reuse singleton AudioContext
    if (!globalAudioContext || globalAudioContext.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      globalAudioContext = new AudioContextClass();
    }

    // ✅ Resume context if suspended (required on mobile)
    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }

    const audioBuffer = globalAudioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.copyToChannel(float32Array, 0);

    // Create source and play
    const source = globalAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(globalAudioContext.destination);
    source.start(0);

    // Return a promise that resolves when audio finishes
    return new Promise((resolve) => {
      source.onended = () => {
        resolve();
      };
    });
  } catch (error) {
    console.error('Web Audio API playback error:', error);
    throw error;
  }
}

/**
 * High-level function: Generate and play speech with Gemini TTS (natural human-like voice)
 * @param text - Text to speak
 * @param voiceName - Voice option (default: 'Kore' - firm and confident)
 */
export async function speak(text: string, voiceName: string = 'Kore'): Promise<void> {
  try {
    console.log('🎙️ Using Gemini TTS for natural voice...');
    const audioData = await generateSpeech(text, voiceName);
    await playAudioFromBase64(audioData);
  } catch (error) {
    console.error('❌ Gemini TTS failed, using browser fallback:', error);
    // Fallback to browser TTS if Gemini fails
    fallbackToSpeechSynthesis(text);
  }
}

/**
 * Fallback to browser's speechSynthesis if Gemini TTS fails
 */
function fallbackToSpeechSynthesis(text: string): void {
  console.warn('⚠️ Using fallback speechSynthesis');
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
