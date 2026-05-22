#!/usr/bin/env node
import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { generateSpec as generateAnthropicSpec } from './generator.js';
import { generateSpec as generateGithubSpec } from './generator-github-models.js';
import { readQTestFile, generateFromQTest } from './qtest.js';

loadEnv();

const program = new Command();

program
  .name('playwright-ai')
  .description('PoC : générer des tests Playwright à partir de prompts NL via IA.')
  .version('0.1.0');

program
  .command('generate')
  .description('Générer un test Playwright depuis un prompt en langage naturel.')
  .requiredOption('-p, --prompt <text>', 'Description du scénario en langage naturel')
  .option('-o, --out <path>', 'Chemin de sortie du fichier .spec.ts', 'tests/generated.spec.ts')
  .option('-m, --model <model>', 'Modèle à utiliser (dépend du provider)')
  .option(
    '--provider <provider>',
    'Provider LLM : anthropic (défaut) ou github',
    'anthropic',
  )
  .action(
    async (opts: { prompt: string; out: string; model?: string; provider: string }) => {
      if (opts.provider === 'github') {
        requireGithubToken();
        process.stdout.write(
          `→ Génération via GitHub Models (${opts.model ?? process.env.GITHUB_MODEL ?? 'gpt-4o-mini'})...\n`,
        );
        const result = await generateGithubSpec({ prompt: opts.prompt, model: opts.model });
        await writeOut(opts.out, result.code);
        process.stdout.write(`✓ Écrit : ${opts.out}\n  Modèle : ${result.model}\n`);
      } else {
        requireApiKey();
        process.stdout.write(`→ Génération via Claude (${opts.model ?? 'défaut'})...\n`);
        const result = await generateAnthropicSpec({ prompt: opts.prompt, model: opts.model });
        await writeOut(opts.out, result.code);
        process.stdout.write(
          `✓ Écrit : ${opts.out}\n` +
            `  Modèle : ${result.model}\n` +
            `  Tokens in/out : ${result.inputTokens}/${result.outputTokens}\n` +
            `  Cache create/read : ${result.cacheCreationInputTokens}/${result.cacheReadInputTokens}\n`,
        );
      }
    },
  );

program
  .command('qtest')
  .description('Convertir un export qTest JSON en specs Playwright.')
  .requiredOption('-f, --file <path>', 'Fichier JSON qTest en entrée')
  .option('-o, --out-dir <dir>', 'Répertoire de sortie', 'tests/qtest')
  .option('-m, --model <model>', 'Modèle Anthropic à utiliser')
  .action(async (opts: { file: string; outDir: string; model?: string }) => {
    requireApiKey();
    const cases = await readQTestFile(opts.file);
    process.stdout.write(`→ ${cases.length} cas qTest à convertir\n`);
    for (const tc of cases) {
      const result = await generateFromQTest(tc);
      const slug = String(tc.name)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const outPath = resolve(opts.outDir, `${tc.id}-${slug}.spec.ts`);
      await writeOut(outPath, result.code);
      process.stdout.write(`  ✓ ${outPath}  (cache read : ${result.cacheReadInputTokens})\n`);
    }
  });

program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(`✗ Erreur : ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});

async function writeOut(path: string, content: string) {
  const abs = resolve(path);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, content, 'utf-8');
}

function requireApiKey() {
  if (!process.env.ANTHROPIC_API_KEY) {
    process.stderr.write(
      '✗ ANTHROPIC_API_KEY est manquante. Copiez .env.example en .env et renseignez la clé.\n',
    );
    process.exit(2);
  }
}

function requireGithubToken() {
  if (!process.env.GITHUB_TOKEN) {
    process.stderr.write(
      '✗ GITHUB_TOKEN est manquant. Dans GitHub Actions il est fourni automatiquement.\n' +
        '  En local : export GITHUB_TOKEN=$(gh auth token)\n',
    );
    process.exit(2);
  }
}
