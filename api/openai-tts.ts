import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function for text-to-speech using OpenAI TTS
 * Industry-leading natural voices with excellent pronunciation
 *
 * Query parameters:
 * - text: The text to convert to speech (required)
 * - voice: Voice name (optional, default: nova)
 *
 * Available voices:
 * - alloy: Neutral and balanced
 * - echo: Male, warm and engaging
 * - fable: British accent, expressive
 * - onyx: Deep male voice, authoritative
 * - nova: Female, warm and natural (recommended - most human-like)
 * - shimmer: Female, bright and energetic
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, voice = 'nova' } = req.query;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    if (text.length > 4096) {
      return res.status(400).json({ error: 'Text too long (max 4096 characters)' });
    }

    // Check for API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'OpenAI API key not configured',
        hint: 'Please set OPENAI_API_KEY in Vercel environment variables'
      });
    }

    console.log('🎤 OpenAI TTS: Generating speech for:', text.substring(0, 50));

    // Call OpenAI Text-to-Speech API
    const response = await fetch(
      'https://api.openai.com/v1/audio/speech',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',  // Fast model (tts-1-hd for higher quality but slower)
          input: text,
          voice: typeof voice === 'string' ? voice : 'nova',
          speed: 1.0,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI TTS API error:', response.status, errorText);
      return res.status(response.status).json({
        error: 'OpenAI TTS API failed',
        details: errorText,
      });
    }

    // Get audio buffer (MP3 format)
    const audioBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(audioBuffer);

    console.log('✅ OpenAI TTS: Generated', buffer.length, 'bytes of audio');

    // Return MP3 audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(buffer);
  } catch (error: any) {
    console.error('❌ OpenAI TTS error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
}
