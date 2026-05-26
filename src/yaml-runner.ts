import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

export interface Scenario {
  name: string;
  url: string;
  prompt: string;
}

export interface ScenariosFile {
  scenarios: Scenario[];
}

export function parseScenariosYaml(content: string): ScenariosFile {
  const data: unknown = parseYaml(content);
  return validateScenariosFile(data);
}

export async function readScenariosFile(path: string): Promise<ScenariosFile> {
  const content = await readFile(path, 'utf-8');
  return parseScenariosYaml(content);
}

export function scenarioToSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function validateScenariosFile(data: unknown): ScenariosFile {
  if (typeof data !== 'object' || data === null) {
    throw new Error('YAML invalide : la racine doit être un objet.');
  }
  const root = data as Record<string, unknown>;
  if (!Array.isArray(root['scenarios'])) {
    throw new Error('YAML invalide : la clé "scenarios" est manquante ou n\'est pas un tableau.');
  }
  const scenarios: Scenario[] = [];
  for (const [i, item] of (root['scenarios'] as unknown[]).entries()) {
    scenarios.push(validateScenario(item, i));
  }
  if (scenarios.length === 0) {
    throw new Error('YAML invalide : "scenarios" ne contient aucun élément.');
  }
  return { scenarios };
}

function validateScenario(item: unknown, index: number): Scenario {
  const prefix = `scenarios[${index}]`;
  if (typeof item !== 'object' || item === null) {
    throw new Error(`${prefix} : chaque scénario doit être un objet.`);
  }
  const s = item as Record<string, unknown>;

  const name = s['name'];
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(`${prefix}.name : champ obligatoire de type string non vide.`);
  }

  const url = s['url'];
  if (typeof url !== 'string' || url.trim() === '') {
    throw new Error(`${prefix}.url : champ obligatoire de type string non vide.`);
  }
  try {
    new URL(url);
  } catch {
    throw new Error(`${prefix}.url : "${url}" n'est pas une URL valide.`);
  }

  const prompt = s['prompt'];
  if (typeof prompt !== 'string' || prompt.trim() === '') {
    throw new Error(`${prefix}.prompt : champ obligatoire de type string non vide.`);
  }

  return { name: name.trim(), url: url.trim(), prompt: prompt.trim() };
}
