/**
 * Claude API service using Anthropic's Claude Haiku 3.5
 * Replaces Gemini for text generation (explanations, evaluations, summaries)
 * API calls are proxied through /api/claude to keep API key secure
 */

import { UserProfile, ChatMessage } from '../types';
import { useStore } from '../store';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Call Claude API via our serverless function (keeps API key secure)
 * Automatically tracks token usage and cost
 */
async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt?: string,
  temperature: number = 0.7
): Promise<string> {
  const response = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      system: systemPrompt,
      temperature,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Claude API error: ${response.status} ${JSON.stringify(errorData)}`);
  }

  const data = await response.json();

  // ✅ Track token usage
  if (data.usage) {
    const { input_tokens, output_tokens } = data.usage;
    console.log(`📊 Token usage: ${input_tokens} input, ${output_tokens} output`);

    // Save to store
    const addTokenUsage = useStore.getState().addTokenUsage;
    addTokenUsage(input_tokens, output_tokens);
  }

  return data.content[0].text;
}

/**
 * Parse JSON from Claude's response (handles markdown code blocks)
 */
function parseJSON(text: string): any {
  // Remove markdown code blocks if present
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;

  try {
    return JSON.parse(jsonText.trim());
  } catch (e) {
    console.error('Failed to parse JSON from Claude response:', jsonText);
    throw new Error('Invalid JSON response from Claude');
  }
}

/**
 * Generate word explanation using Claude
 */
export async function generateWordExplanation(
  word: string,
  profile: UserProfile,
  context: string
) {
  const prompt = `
You are an expert English tutor.

User Profile:
Name: ${profile.name}
City: ${profile.city}
Job: ${profile.occupation}
Hobbies: ${profile.hobbies}

Today's Context: ${context}

Task: Explain the word "${word}" and create a personalized example sentence.

Requirements:
1. "meaning": Simple English definition (CEFR B1 level).
2. "phonetic": American English phonetic transcription in IPA format (e.g., /prəˌkræstɪˈneɪʃn/).
3. "example": A VERY SHORT, CONVERSATIONAL sentence (max 8-12 words) using "${word}". It MUST sound like something spoken in real life, not a textbook sentence.
4. "exampleTranslation": The Chinese (中文) translation of the example sentence.
   - MUST be in Chinese (中文), not English
   - MUST contain at least 2 Chinese characters (汉字)
   - Do NOT return: punctuation only, symbols (°, ?, .), or English text
   - Example: "我需要买些日用品。" ✓   "." ✗   "°" ✗

Respond ONLY with valid JSON in this exact format:
{
  "meaning": "...",
  "phonetic": "...",
  "example": "...",
  "exampleTranslation": "..."
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }]);
  console.log('🔍 [generateWordExplanation] Raw Claude response:', responseText);

  const data = parseJSON(responseText);
  console.log('🔍 [generateWordExplanation] Parsed JSON:', JSON.stringify(data, null, 2));

  if (!data.meaning || !data.phonetic || !data.example || !data.exampleTranslation) {
    console.error('❌ [generateWordExplanation] Missing required fields:', data);
    throw new Error('Invalid response from Claude: missing required fields');
  }

  // ✅ Validate translation quality - must contain Chinese characters
  const translation = data.exampleTranslation.trim();
  console.log('🔍 [generateWordExplanation] Translation before validation:', JSON.stringify(translation));
  console.log('🔍 [generateWordExplanation] Translation length:', translation.length);
  console.log('🔍 [generateWordExplanation] Contains Chinese?', /[\u4e00-\u9fa5]/.test(translation));

  // Primary check: MUST contain Chinese characters
  if (!/[\u4e00-\u9fa5]/.test(translation)) {
    console.warn('⚠️ [generateWordExplanation] Translation invalid (no Chinese):', JSON.stringify(translation));
    data.exampleTranslation = '（翻译失败）';
  }

  // Secondary check: If it's too short (< 2 chars), likely invalid
  else if (translation.length < 2) {
    console.warn('⚠️ [generateWordExplanation] Translation too short:', JSON.stringify(translation));
    data.exampleTranslation = '（翻译失败）';
  }

  console.log('🔍 [generateWordExplanation] Final translation:', JSON.stringify(data.exampleTranslation));
  return data;
}

/**
 * Evaluate shadowing (pronunciation practice)
 */
export async function evaluateShadowing(
  targetSentence: string,
  userTranscript: string
) {
  const prompt = `
Task: Evaluate if the student's pronunciation (transcribed text) matches the target sentence.

Target: "${targetSentence}"
User Said: "${userTranscript}"

Requirements:
1. Ignore minor punctuation or casing.
2. Allow for minor speech-to-text errors (e.g. homophones).
3. Return isCorrect: true if it's mostly accurate.
4. Provide brief feedback.

Respond ONLY with valid JSON in this exact format:
{
  "isCorrect": true/false,
  "feedback": "..."
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }]);
  const data = parseJSON(responseText);

  if (typeof data.isCorrect !== 'boolean' || !data.feedback) {
    throw new Error('Invalid shadowing evaluation response');
  }

  return data;
}

/**
 * Evaluate user's sentence using the target word
 */
export async function evaluateUserSentence(
  word: string,
  userSentence: string,
  context: string
) {
  const prompt = `
Task: Evaluate the student's sentence using the target word "${word}".
Context: ${context}
Student Sentence: "${userSentence}"

Requirements:
1. Check if the word is used correctly.
2. Check for major grammar errors.
3. Provide a "betterWay" to say it (more natural/native) if applicable, otherwise repeat the corrected version.

Respond ONLY with valid JSON in this exact format:
{
  "isCorrect": true/false,
  "feedback": "...",
  "betterWay": "..."
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }]);
  const data = parseJSON(responseText);

  if (typeof data.isCorrect !== 'boolean' || !data.feedback || !data.betterWay) {
    throw new Error('Invalid sentence evaluation response');
  }

  return data;
}

/**
 * Translate English sentence to Chinese
 */
export async function translateToChinese(sentence: string): Promise<string> {
  // ✅ Validate input
  if (!sentence || sentence.trim().length === 0) {
    return '（无句子）';
  }

  const prompt = `
Translate this English sentence to natural Chinese (中文):

"${sentence}"

CRITICAL Requirements:
1. Output MUST be in Chinese (中文), not English
2. Output MUST contain at least 2 Chinese characters (汉字)
3. Translate naturally and conversationally
4. Return ONLY the Chinese translation

FORBIDDEN outputs (will be rejected):
- Punctuation only: "." "?" "°" "！" ✗
- Symbols or numbers only ✗
- English text ✗
- Empty responses ✗

Correct example:
Input: "I need to buy some groceries today."
Output: 我今天需要买些日用品。 ✓
`;

  try {
    const responseText = await callClaude([{ role: 'user', content: prompt }], undefined, 0.3);
    console.log('🔍 [translateToChinese] Raw Claude response:', responseText);

    const translation = responseText.trim();
    console.log('🔍 [translateToChinese] Translation before validation:', JSON.stringify(translation));
    console.log('🔍 [translateToChinese] Translation length:', translation.length);
    console.log('🔍 [translateToChinese] Contains Chinese?', /[\u4e00-\u9fa5]/.test(translation));

    // ✅ Primary validation: MUST contain Chinese characters
    if (!translation || translation.length === 0) {
      console.warn('⚠️ [translateToChinese] Empty translation received');
      return '（翻译失败）';
    }

    if (!/[\u4e00-\u9fa5]/.test(translation)) {
      console.warn('⚠️ [translateToChinese] Translation invalid (no Chinese):', JSON.stringify(translation));
      return '（翻译失败）';
    }

    // ✅ Secondary validation: Must be at least 2 characters
    if (translation.length < 2) {
      console.warn('⚠️ [translateToChinese] Translation too short:', JSON.stringify(translation));
      return '（翻译失败）';
    }

    console.log('🔍 [translateToChinese] Final translation:', JSON.stringify(translation));
    return translation;
  } catch (error) {
    console.error('❌ [translateToChinese] Translation error:', error);
    return '（翻译失败）';
  }
}

/**
 * Compare two sentences semantically and return similarity score with feedback
 */
export async function compareSentences(originalSentence: string, userSentence: string) {
  const prompt = `
Compare these two English sentences semantically:

Original: "${originalSentence}"
User said: "${userSentence}"

Task:
1. Calculate semantic similarity (0-100, where 100 = perfect match in meaning)
2. Identify specific differences (word choice, grammar, meaning)
3. Provide concise feedback (1-2 sentences max)

Scoring guide:
- 90-100: Perfect or near-perfect match
- 70-89: Same meaning, minor differences in word choice
- 50-69: Similar meaning but noticeable differences
- 0-49: Different meaning or major errors

Respond ONLY with valid JSON:
{
  "similarity": 85,
  "feedback": "Great! You used 'purchase' instead of 'buy' - both are correct.",
  "differences": ["buy → purchase"]
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }], undefined, 0.3);
  const data = parseJSON(responseText);

  if (typeof data.similarity !== 'number' || !data.feedback) {
    throw new Error('Invalid sentence comparison response');
  }

  return {
    similarity: data.similarity,
    feedback: data.feedback,
    differences: data.differences || []
  };
}
