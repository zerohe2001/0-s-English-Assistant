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
4. "exampleTranslation": The Chinese translation of the example sentence.

Respond ONLY with valid JSON in this exact format:
{
  "meaning": "...",
  "phonetic": "...",
  "example": "...",
  "exampleTranslation": "..."
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }]);
  const data = parseJSON(responseText);

  if (!data.meaning || !data.phonetic || !data.example || !data.exampleTranslation) {
    throw new Error('Invalid response from Claude: missing required fields');
  }

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
 * Generate conversation scene description based on user's created sentences
 */
export async function generateConversationScene(
  profile: UserProfile,
  context: string,
  words: string[],
  userSentences?: { [wordId: string]: string }
) {
  // Extract user sentences if available
  const sentencesList = userSentences ? Object.values(userSentences).filter(Boolean) : [];
  const hasSentences = sentencesList.length > 0;

  const prompt = `
Create a roleplay scenario in EXACTLY 2 short sentences:

User: ${profile.name} (${profile.occupation} in ${profile.city})
Activity: ${context}
Target Words: ${words.join(', ')}

${hasSentences ? `User's Example Sentences:\n${sentencesList.map((s, i) => `${i + 1}. "${s}"`).join('\n')}\n\nIMPORTANT: Base the scenario on the topics/situations mentioned in the user's sentences above.` : ''}

Format (MUST follow):
Sentence 1: Describe the situation (max 15 words)
Sentence 2: State who you are playing (max 10 words)

Example: "You're ordering coffee at a café. I'll be the barista."
Example: "You're checking into a hotel. I'm the front desk staff."
Example: "You're at a job interview. I'll play the interviewer."

CRITICAL: Output ONLY 2 sentences, nothing else!
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }], undefined, 0.8);

  let scene = responseText.trim();
  if (!scene) {
    throw new Error('No conversation scene generated');
  }

  // Force truncate to first 2 sentences if AI ignores instructions
  const sentences = scene.match(/[^.!?]+[.!?]+/g) || [scene];
  if (sentences.length > 2) {
    scene = sentences.slice(0, 2).join(' ');
  }

  // Enforce max length (200 chars)
  if (scene.length > 200) {
    scene = scene.substring(0, 197) + '...';
  }

  return scene;
}

/**
 * Generate session summary from conversation history
 */
export async function generateSessionSummary(
  history: ChatMessage[],
  targetWords: string[]
) {
  // ✅ Validate input first
  if (!history || history.length === 0) {
    console.warn('⚠️ Empty conversation history, returning default summary');
    return {
      usedWords: [],
      missedWords: targetWords,
      feedback: 'No conversation was recorded. Please try again and make sure to speak during the session.'
    };
  }

  const transcript = history.map(h => `${h.role}: ${h.text}`).join('\n');

  const prompt = `
You are analyzing a language learning conversation. The user practiced these target words: ${targetWords.join(', ')}

CONVERSATION TRANSCRIPT:
${transcript}

TASK:
1. Find which target words the USER (not the AI) used correctly in their responses
2. List which target words were NOT used by the user
3. Give brief encouraging feedback (2-3 sentences)

CRITICAL: You MUST respond with ONLY valid JSON. No explanations, no markdown, just raw JSON.

Format:
{
  "usedWords": ["word1", "word2"],
  "missedWords": ["word3", "word4"],
  "feedback": "Great job using word1 and word2! Try to use word3 next time."
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }]);
  const data = parseJSON(responseText);

  if (!Array.isArray(data.usedWords) || !Array.isArray(data.missedWords) || !data.feedback) {
    throw new Error('Invalid session summary response');
  }

  return data;
}

/**
 * Translate English sentence to Chinese
 */
export async function translateToChinese(sentence: string): Promise<string> {
  const prompt = `
Translate this English sentence to natural Chinese:

"${sentence}"

Requirements:
1. Translate naturally (not word-for-word)
2. Use conversational Chinese
3. Return ONLY the Chinese translation, nothing else

Example:
Input: "I need to buy some groceries today."
Output: 我今天需要买些日用品。
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }], undefined, 0.3);
  return responseText.trim();
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
