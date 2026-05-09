import Anthropic from '@anthropic-ai/sdk';
import { SAUCEDEMO_SYSTEM_PROMPT } from './system-prompt.js';

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';

export interface GenerateOptions {
  prompt: string;
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
}

const client = new Anthropic();

export async function generateSpec(opts: GenerateOptions): Promise<GenerateResult> {
  const model = opts.model ?? DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 2048,
    system: [
      {
        type: 'text',
        text: SAUCEDEMO_SYSTEM_PROMPT,
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
  };
}

function stripCodeFences(text: string): string {
  const fenced = text.match(/^```(?:typescript|ts)?\s*\n([\s\S]*?)\n```\s*$/);
  if (fenced) return fenced[1].trim() + '\n';
  return text.endsWith('\n') ? text : text + '\n';
}
