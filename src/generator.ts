import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { buildSystemPrompt } from './system-prompt.js';

const DEFAULT_ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
const DEFAULT_GITHUB_MODEL = process.env.GITHUB_MODEL ?? 'gpt-4o-mini';
const DEFAULT_URL = 'https://www.saucedemo.com';
const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';

export interface GenerateOptions {
  prompt: string;
  url?: string;
  model?: string;
  maxTokens?: number;
}

export interface GenerateResult {
  code: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  model: string;
  provider: 'anthropic' | 'github';
}

function detectProvider(): 'anthropic' | 'github' {
  if (process.env.GITHUB_TOKEN) return 'github';
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
  throw new Error(
    'Aucune clé API configurée. Définissez GITHUB_TOKEN (GitHub Models, gratuit) ou ANTHROPIC_API_KEY dans votre .env.',
  );
}

export async function generateSpec(opts: GenerateOptions): Promise<GenerateResult> {
  const provider = detectProvider();
  const url = opts.url ?? DEFAULT_URL;
  const systemPrompt = buildSystemPrompt(url);

  if (provider === 'github') {
    return generateWithGitHubModels(opts, systemPrompt);
  }
  return generateWithAnthropic(opts, systemPrompt);
}

async function generateWithGitHubModels(
  opts: GenerateOptions,
  systemPrompt: string,
): Promise<GenerateResult> {
  const model = opts.model ?? DEFAULT_GITHUB_MODEL;
  const client = new OpenAI({
    baseURL: GITHUB_MODELS_ENDPOINT,
    apiKey: process.env.GITHUB_TOKEN,
  });

  const response = await client.chat.completions.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Génère un test Playwright pour ce scénario :\n\n${opts.prompt}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content?.trim() ?? '';
  return {
    code: stripCodeFences(raw),
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    model: response.model,
    provider: 'github',
  };
}

async function generateWithAnthropic(
  opts: GenerateOptions,
  systemPrompt: string,
): Promise<GenerateResult> {
  const model = opts.model ?? DEFAULT_ANTHROPIC_MODEL;
  const client = new Anthropic();

  const response = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    system: [
      {
        type: 'text',
        text: systemPrompt,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Génère un test Playwright pour ce scénario :\n\n${opts.prompt}`,
      },
    ],
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === 'text',
  );
  const raw = textBlocks.map((b) => b.text).join('\n').trim();

  return {
    code: stripCodeFences(raw),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
    cacheCreationInputTokens: response.usage.cache_creation_input_tokens ?? 0,
    cacheReadInputTokens: response.usage.cache_read_input_tokens ?? 0,
    model: response.model,
    provider: 'anthropic',
  };
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/^```(?:typescript|ts)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenced) return fenced[1].trim() + '\n';
  return text.endsWith('\n') ? text : text + '\n';
}
