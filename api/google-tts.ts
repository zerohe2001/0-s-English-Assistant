import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function for text-to-speech using Google Cloud TTS
 * Fast, high-quality, and reliable
 *
 * Query parameters:
 * - text: The text to convert to speech (required)
 * - voice: Voice name (optional, default: en-US-Neural2-F)
 *
 * Available voices:
 * - en-US-Neural2-F (Female, warm and natural - similar to Ava)
 * - en-US-Neural2-J (Female, young and energetic)
 * - en-US-Neural2-D (Male, professional and clear)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only accept GET requests
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { text, voice = 'en-US-Neural2-F' } = req.query;

    // Validate input
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required' });
    }

    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'Google Cloud TTS API key not configured',
        hint: 'Please set GOOGLE_CLOUD_TTS_API_KEY in Vercel environment variables'
      });
    }

    console.log('🎤 Google TTS: Generating speech for:', text.substring(0, 50));

    // Call Google Cloud Text-to-Speech API
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: 'en-US',
            name: typeof voice === 'string' ? voice : 'en-US-Neural2-F',
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0.0,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Google TTS API error:', errorData);
      return res.status(response.status).json({
        error: 'Google TTS API failed',
        details: errorData,
      });
    }

    const data = await response.json();

    if (!data.audioContent) {
      return res.status(500).json({ error: 'No audio content in response' });
    }

    // Convert base64 audio to buffer
    const audioBuffer = Buffer.from(data.audioContent, 'base64');

    console.log('✅ Google TTS: Generated', audioBuffer.length, 'bytes of audio');

    // Return MP3 audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', audioBuffer.length.toString());
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(audioBuffer);
  } catch (error: any) {
    console.error('❌ Google TTS error:', error);
    res.status(500).json({
      error: 'Failed to generate speech',
      message: error.message,
    });
  }
}
