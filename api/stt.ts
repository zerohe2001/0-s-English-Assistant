import { createClient } from '@deepgram/sdk';
import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function for speech-to-text using Deepgram Nova-3
 *
 * POST request with audio file in body
 * Content-Type should be audio/webm, audio/wav, audio/mp3, etc.
 *
 * Returns: { transcript: string }
 *
 * Deepgram API key must be set in DEEPGRAM_API_KEY environment variable
 * Get free $200 credits at: https://deepgram.com
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Check for API key
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      console.error('❌ DEEPGRAM_API_KEY not configured');
      return res.status(500).json({
        error: 'Speech recognition not configured',
        message: 'Please add DEEPGRAM_API_KEY to environment variables'
      });
    }

    // Get audio data from request body
    const audioBuffer = req.body;
    if (!audioBuffer || audioBuffer.length === 0) {
      return res.status(400).json({ error: 'No audio data provided' });
    }

    console.log('🎙️ STT API: Received', audioBuffer.length, 'bytes of audio');

    // Initialize Deepgram client
    const deepgram = createClient(apiKey);

    // Transcribe audio using Nova-3 model (batch/pre-recorded)
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: 'nova-3',
        smart_format: true,
        punctuate: true,
        language: 'en-US',
      }
    );

    if (error) {
      console.error('❌ Deepgram API error:', error);
      return res.status(500).json({
        error: 'Transcription failed',
        message: error.message
      });
    }

    // Extract transcript from result
    const transcript = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '';

    console.log('✅ STT API: Transcribed:', transcript.substring(0, 100));

    // Return transcript
    res.status(200).json({ transcript });
  } catch (error: any) {
    console.error('❌ STT API error:', error);
    res.status(500).json({
      error: 'Failed to transcribe audio',
      message: error.message
    });
  }
}

// Configure body parser to handle raw audio data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Allow up to 10MB audio files
    },
  },
};
