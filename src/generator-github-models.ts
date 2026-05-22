import OpenAI from 'openai';
import { SAUCEDEMO_SYSTEM_PROMPT } from './system-prompt.js';

const DEFAULT_MODEL = process.env.GITHUB_MODEL ?? 'gpt-4o-mini';

const client = new OpenAI({
  baseURL: 'https://models.inference.ai.azure.com',
  apiKey: process.env.GITHUB_TOKEN ?? '',
});

export interface GenerateOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  code: string;
  model: string;
}

export async function generateSpec(opts: GenerateOptions): Promise<GenerateResult> {
  const model = opts.model ?? DEFAULT_MODEL;

  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: 'system', content: SAUCEDEMO_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Génère un test Playwright pour ce scénario :\n\n${opts.prompt}`,
      },
    ],
  });

  const raw = (response.choices[0]?.message?.content ?? '').trim();

  return {
    code: stripCodeFences(raw),
    model: response.model,
  };
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/^```(?:typescript|ts)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenced) return fenced[1].trim() + '\n';
  return text.endsWith('\n') ? text : text + '\n';
}
