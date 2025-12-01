import { EdgeTTS } from 'edge-tts-universal';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function for text-to-speech
 * Uses Microsoft Edge's TTS service (free, no API key needed)
 *
 * Query parameters:
 * - text: The text to convert to speech (required)
 * - voice: Voice name (optional, default: en-US-AvaMultilingualNeural)
 *
 * Available voices:
 * - en-US-AvaMultilingualNeural (Female, natural)
 * - en-US-AndrewMultilingualNeural (Male, natural)
 * - en-US-EmmaMultilingualNeural (Female, warm)
 * - en-US-BrianMultilingualNeural (Male, firm)
 * - en-GB-SoniaNeural (British Female)
 * - en-GB-RyanNeural (British Male)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, voice = 'en-US-AvaMultilingualNeural' } = req.query;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long (max 1000 characters)' });
    }

    console.log('🎤 TTS API: Generating speech for:', text.substring(0, 50));

    // Generate speech using Edge TTS
    const tts = new EdgeTTS(text, typeof voice === 'string' ? voice : 'en-US-AvaMultilingualNeural');
    const result = await tts.synthesize();

    // Convert audio Blob to Buffer
    const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

    console.log('✅ TTS API: Generated', audioBuffer.length, 'bytes of audio');

    // Return MP3 audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('❌ TTS API error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message
    });
  }
}
