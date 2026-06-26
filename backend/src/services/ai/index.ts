/**
 * HVAC RenewIQ — AI Engine Core
 *
 * Central hub for GPT-4 based AI services using OpenAI API.
 * Falls back to deterministic scoring when API key is unavailable.
 */
import OpenAI from 'openai';
import { env } from '../../config/env';

let openai: OpenAI | null = null;

function getClient(): OpenAI | null {
  if (openai) return openai;
  if (env.openaiApiKey && !env.openaiApiKey.startsWith('placeholder-')) {
    openai = new OpenAI({ apiKey: env.openaiApiKey });
  }
  return openai;
}

export async function callGPT4(prompt: string, systemPrompt?: string): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt || 'You are an HVAC business analyst assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
    return response.choices[0]?.message?.content || null;
  } catch (error) {
    console.error('[AI] GPT-4 call failed:', (error as Error).message);
    return null;
  }
}

export { getClient as getOpenAIClient };