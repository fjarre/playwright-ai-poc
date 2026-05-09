import { readFile } from 'node:fs/promises';
import { generateSpec } from './generator.js';

/**
 * Format minimal accepté pour un export qTest simplifié.
 * Le PoC accepte un fichier JSON contenant un tableau de cas de test
 * avec au minimum : id, name, description, steps[] (action + expected).
 */
export interface QTestCase {
  id: string | number;
  name: string;
  description?: string;
  steps?: Array<{
    order?: number;
    action: string;
    expected?: string;
  }>;
}

export async function readQTestFile(path: string): Promise<QTestCase[]> {
  const raw = await readFile(path, 'utf-8');
  const parsed = JSON.parse(raw);
  const list = Array.isArray(parsed) ? parsed : parsed.testCases ?? parsed.cases ?? [];
  if (!Array.isArray(list)) {
    throw new Error('qTest JSON: structure non reconnue (attendu un tableau ou {testCases:[...]}).');
  }
  return list as QTestCase[];
}

export function qTestCaseToPrompt(tc: QTestCase): string {
  const parts: string[] = [];
  parts.push(`Cas qTest #${tc.id} — ${tc.name}`);
  if (tc.description) parts.push(`Description : ${tc.description}`);
  if (tc.steps && tc.steps.length > 0) {
    parts.push('Étapes :');
    for (const [i, s] of tc.steps.entries()) {
      const order = s.order ?? i + 1;
      const expected = s.expected ? ` (attendu : ${s.expected})` : '';
      parts.push(`  ${order}. ${s.action}${expected}`);
    }
  }
  return parts.join('\n');
}

export async function generateFromQTest(tc: QTestCase) {
  const prompt = qTestCaseToPrompt(tc);
  return generateSpec({ prompt });
}
