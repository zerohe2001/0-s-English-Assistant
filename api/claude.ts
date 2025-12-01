import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function for Claude API
 * Proxies requests to Anthropic Claude API to keep API key secure
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error('❌ CLAUDE_API_KEY not configured');
    return res.status(500).json({
      error: 'Claude API not configured',
      message: 'Please add CLAUDE_API_KEY to environment variables'
    });
  }

  try {
    const { messages, system, temperature = 0.7, max_tokens = 1024 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages array required' });
    }

    console.log('🤖 Calling Claude API with', messages.length, 'messages');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens,
        temperature,
        system,
        messages,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Claude API error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'Claude API error',
        details: errorData
      });
    }

    const data = await response.json();
    console.log('✅ Claude API response received');

    res.status(200).json(data);
  } catch (error: any) {
    console.error('❌ Claude API handler error:', error);
    res.status(500).json({
      error: 'Failed to call Claude API',
      message: error.message
    });
  }
}
