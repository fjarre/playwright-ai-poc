#!/usr/bin/env node
import { Command } from 'commander';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { generateSpec } from './generator.js';
import { readQTestFile, generateFromQTest } from './qtest.js';
import { readScenariosFile, scenarioToSlug } from './yaml-runner.js';

loadEnv();

const program = new Command();

program
  .name('playwright-ai')
  .description('PoC : générer des tests Playwright à partir de prompts NL via Claude.')
  .version('0.1.0');

program
  .command('generate')
  .description('Générer un test Playwright depuis un prompt en langage naturel.')
  .requiredOption('-p, --prompt <text>', 'Description du scénario en langage naturel')
  .option('-u, --url <url>', 'URL de l\'application cible', 'https://www.saucedemo.com')
  .option('-o, --out <path>', 'Chemin de sortie du fichier .spec.ts', 'tests/generated.spec.ts')
  .option('-m, --model <model>', 'Modèle à utiliser (GitHub Models ou Anthropic)')
  .action(async (opts: { prompt: string; url: string; out: string; model?: string }) => {
    requireApiKey();
    const result = await generateSpec({ prompt: opts.prompt, url: opts.url, model: opts.model });
    await writeOut(opts.out, result.code);
    process.stdout.write(
      `✓ Écrit : ${opts.out}\n` +
        `  Provider : ${result.provider} | Modèle : ${result.model}\n` +
        `  Tokens in/out : ${result.inputTokens}/${result.outputTokens}\n`,
    );
  });

program
  .command('scenarios')
  .description('Générer des tests Playwright depuis un fichier YAML multi-scénarios.')
  .requiredOption('-f, --file <path>', 'Fichier YAML de scénarios en entrée')
  .option('-o, --out-dir <dir>', 'Répertoire de sortie des fichiers .spec.ts', 'tests/generated')
  .option('-m, --model <model>', 'Modèle à utiliser (GitHub Models ou Anthropic)')
  .action(async (opts: { file: string; outDir: string; model?: string }) => {
    requireApiKey();
    const { scenarios } = await readScenariosFile(opts.file);
    process.stdout.write(`→ ${scenarios.length} scénario(s) à générer depuis ${opts.file}\n`);
    let ok = 0;
    let failed = 0;
    for (const [i, scenario] of scenarios.entries()) {
      const prefix = `  [${i + 1}/${scenarios.length}] "${scenario.name}"`;
      process.stdout.write(`${prefix} → ${scenario.url}\n`);
      try {
        const result = await generateSpec({
          prompt: scenario.prompt,
          url: scenario.url,
          model: opts.model,
        });
        const slug = scenarioToSlug(scenario.name);
        const outPath = resolve(opts.outDir, `${slug}.spec.ts`);
        await writeOut(outPath, result.code);
        process.stdout.write(
          `    ✓ ${outPath}  [${result.provider}/${result.model}  in:${result.inputTokens} out:${result.outputTokens}]\n`,
        );
        ok++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`    ✗ Erreur : ${msg}\n`);
        failed++;
      }
    }
    process.stdout.write(`\n→ ${ok} générés, ${failed} erreurs.\n`);
    if (failed > 0) process.exit(1);
  });

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
  if (!process.env.GITHUB_TOKEN && !process.env.ANTHROPIC_API_KEY) {
    process.stderr.write(
      '✗ Aucune clé API configurée.\n' +
        '  Option A (gratuit) : définissez GITHUB_TOKEN dans .env (GitHub Models).\n' +
        '  Option B : définissez ANTHROPIC_API_KEY dans .env.\n' +
        '  Copiez .env.example en .env pour démarrer.\n',
    );
    process.exit(2);
  }
}
