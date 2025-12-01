/**
 * Claude API service using Anthropic's Claude Haiku 3.5
 * Replaces Gemini for text generation (explanations, evaluations, summaries)
 * API calls are proxied through /api/claude to keep API key secure
 */

import { UserProfile, ChatMessage } from '../types';

interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Call Claude API via our serverless function (keeps API key secure)
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
  const transcript = history.map(h => `${h.role}: ${h.text}`).join('\n');

  const prompt = `
Analyze this roleplay conversation transcript.
Target Words: ${targetWords.join(', ')}

Transcript:
${transcript}

Task:
1. Identify which target words were used correctly by the user.
2. Identify which words were missed or unused.
3. Provide overall feedback on the conversation (fluency, vocabulary usage).

Respond ONLY with valid JSON in this exact format:
{
  "usedWords": ["word1", "word2"],
  "missedWords": ["word3"],
  "feedback": "..."
}
`;

  const responseText = await callClaude([{ role: 'user', content: prompt }]);
  const data = parseJSON(responseText);

  if (!Array.isArray(data.usedWords) || !Array.isArray(data.missedWords) || !data.feedback) {
    throw new Error('Invalid session summary response');
  }

  return data;
}
