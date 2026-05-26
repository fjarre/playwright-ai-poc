# playwright-ai-poc

PoC technique pour [ITE-256](https://github.com/) (parent ITE-255 « PlayWright x AI ») — démontrer la **génération de tests Playwright TypeScript à partir de prompts en langage naturel**, via l'API Anthropic (modèle `claude-sonnet-4-6`) et avec **prompt caching** sur le contexte saucedemo.

> Ce qui est prouvé : un consultant non-développeur écrit une phrase en français, la CLI produit un fichier `.spec.ts` Playwright valide, et `npm test` le passe contre `https://www.saucedemo.com` avec un rapport HTML.
>
> Ce qui n'est PAS prouvé : robustesse sur des sites métier réels (B2B custom), ni sur des prompts ambigus ou des UIs sans `data-test-id`. Le PoC se limite à saucedemo, qui est calibré pour la démonstration.

---

## TL;DR

```bash
npm install
npx playwright install chromium
cp .env.example .env       # puis renseigner ANTHROPIC_API_KEY

# Génération depuis un prompt
npm run generate -- --prompt "Tester que le login fonctionne avec standard_user et secret_sauce" \
                    --out tests/login.spec.ts

# Exécution
npm test                   # rapport HTML dans playwright-report/
npm run test:report        # ouvrir le rapport
```

---

---

## Mode gratuit (GitHub Models)

En plus du mode `anthropic` (clé API payante), la CLI supporte un mode **`github`** utilisant [GitHub Models](https://docs.github.com/en/github-models) — gratuit et disponible nativement dans GitHub Actions via `GITHUB_TOKEN`.

### Deux modes disponibles

| Mode | Provider | Auth | Modèle par défaut | Coût |
|------|----------|------|-------------------|------|
| `anthropic` (défaut) | Anthropic API | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` | ~$0.007/spec |
| `github` | GitHub Models | `GITHUB_TOKEN` | `gpt-4o-mini` | Gratuit |

### Utilisation en local

```bash
# Exporter le token GitHub (si gh CLI installé)
export GITHUB_TOKEN=$(gh auth token)

# Générer un test via GitHub Models
npm run generate -- --provider github --prompt "Tester que le login fonctionne avec standard_user et secret_sauce"

# Ou via le script raccourci
npm run generate:github -- --prompt "Vérifier qu'on peut ajouter un produit au panier"

# Changer de modèle (ex : gpt-4o-mini)
npm run generate -- --provider github --model gpt-4o-mini --prompt "Tester le checkout complet"
```

### Workflow GitHub Actions (zéro secret externe)

Le workflow [`demo-free.yml`](.github/workflows/demo-free.yml) génère et exécute 3 tests Playwright **sans aucun secret supplémentaire** — uniquement le `GITHUB_TOKEN` natif.

```bash
# Déclencher manuellement depuis la CLI GitHub
gh workflow run demo-free.yml \
  --field prompt_1="Tester le login avec standard_user" \
  --field prompt_2="Ajouter un produit au panier" \
  --field prompt_3="Checkout complet jusqu'à la confirmation"
```

Ou depuis l'onglet **Actions → Demo Playwright x GitHub Models (gratuit) → Run workflow** sur GitHub.

### Modèles disponibles

Les modèles testés sur l'endpoint `https://models.inference.ai.azure.com` :

| Modèle | Notes |
|--------|-------|
| `gpt-4o-mini` | Défaut — toujours disponible, sortie structurée |
| `meta/Llama-3.3-70B-Instruct` | Accès selon les permissions GitHub Models de votre compte |

La variable d'environnement `GITHUB_MODEL` permet de surcharger le modèle par défaut sans modifier la commande.
## Architecture

```
playwright-ai-poc/
├── src/
│   ├── cli.ts             # entrée CLI (commander) — 2 sous-commandes : generate | qtest
│   ├── generator.ts       # appel @anthropic-ai/sdk avec prompt caching
│   ├── system-prompt.ts   # contexte saucedemo (sélecteurs, comptes, URLs) — injecté en system, cacheable
│   └── qtest.ts           # parseur JSON qTest → prompt → spec
├── tests/                 # specs Playwright (générés ou commités à la main)
│   ├── login.spec.ts
│   ├── add-to-cart.spec.ts
│   └── checkout.spec.ts
├── examples/
│   └── qtest-sample.json  # 2 cas qTest minimaux pour démontrer l'import
├── test-scenarios/
│   └── scenarios.json     # 5+ scénarios e-commerce (livrable ITE-257, agent SDET)
├── playwright.config.ts   # baseURL https://www.saucedemo.com, reporter html+list
├── package.json
└── tsconfig.json
```

### Choix techniques

| Décision | Pourquoi |
|----------|----------|
| `@anthropic-ai/sdk` officiel + `claude-sonnet-4-6` | Modèle équilibré coût/qualité — Opus n'est pas requis pour générer du Playwright sur un site connu. |
| Prompt caching `cache_control: { type: 'ephemeral' }` sur le system prompt | Le contexte saucedemo (≈ 1.8 ko) est constant — caching = ~90 % d'économie en input tokens à partir du 2e appel. |
| `commander` | Standard de fait pour les CLI Node, syntaxe lisible. |
| `tsx` runtime (pas de build avant exécution) | Démarrage immédiat — un consultant lance `npm run generate` sans étape `tsc`. |
| Sélecteurs `[data-test=...]` imposés dans le system prompt | Saucedemo expose des `data-test` stables ; les forcer évite les sélecteurs CSS fragiles que Claude pourrait inventer. |
| Pas de garde-fou « post-génération » (lint AST, syntaxe TS) | PoC volontairement minimal. Roadmap : valider le code généré via `ts-node --check` avant écriture. |

### Flux

```
prompt NL ──▶ system-prompt.ts (saucedemo context, cacheable)
                    │
                    ▼
        @anthropic-ai/sdk.messages.create
                    │
                    ▼
       réponse text → strip ``` → fichier .spec.ts
                    │
                    ▼
          npx playwright test ──▶ playwright-report/index.html
```

---

## Démo

### Pré-requis

- Node ≥ 20
- Une clé Anthropic dans `ANTHROPIC_API_KEY` (env ou `.env`)
- Connexion Internet vers `https://www.saucedemo.com`

### Trois prompts de démo

Les trois fichiers du dossier `tests/` correspondent aux trois prompts demandés dans le ticket ITE-256 :

| # | Prompt | Spec produite |
|---|--------|---------------|
| 1 | « Tester que le login fonctionne avec `standard_user` et `secret_sauce` » | [`tests/login.spec.ts`](tests/login.spec.ts) |
| 2 | « Vérifier qu'on peut ajouter un produit au panier et voir le total » | [`tests/add-to-cart.spec.ts`](tests/add-to-cart.spec.ts) |
| 3 | « Tester le processus de checkout complet » | [`tests/checkout.spec.ts`](tests/checkout.spec.ts) |

> Les fichiers commités sont des **références** : ils représentent ce que la CLI produit pour chacun des trois prompts. Ils sont versionnés pour que `npm test` passe sur un fresh clone même sans clé Anthropic. Pour régénérer à partir de l'API, voir le script `npm run demo`.

### Régénérer les 3 specs depuis les prompts

```bash
npm run demo
```

(équivaut à 3 appels successifs `tsx src/cli.ts generate --prompt … --out …`)

### Exécution Playwright

```bash
npm test
```

Sortie attendue (validée le 2026-05-09) :

```
Running 3 tests using 3 workers
  ✓  tests\login.spec.ts        ›  Login saucedemo — standard_user        (2.0s)
  ✓  tests\add-to-cart.spec.ts  ›  Panier saucedemo — ajout produit      (2.7s)
  ✓  tests\checkout.spec.ts     ›  Checkout saucedemo — flow complet     (2.6s)

  3 passed (4.6s)
```

Le rapport HTML est dans `playwright-report/index.html` — ouvrir avec `npm run test:report`.

---

## Intégration qTest (optionnel)

```bash
npm run generate:qtest -- --file examples/qtest-sample.json --out-dir tests/qtest
```

Le format JSON accepté est documenté dans [`src/qtest.ts`](src/qtest.ts) : un tableau de cas avec `id`, `name`, `description`, `steps[]`. Chaque cas est converti en prompt structuré (titre + étapes + attendus), puis envoyé à Claude. Le caching s'applique : seul le 1er cas paie le contexte saucedemo, les suivants le lisent en cache.

> Pour un export qTest natif (XML / Excel / API qTest Manager), un adaptateur dédié serait à écrire — hors scope du PoC.

---

## Coût et performance

Estimation par génération (un seul prompt) :

| Composant | Tokens input | Tokens output |
|-----------|-------------:|--------------:|
| System prompt saucedemo (cache hit) | ~500 | — |
| Prompt utilisateur                  |   ~30 | — |
| Réponse spec.ts                     |     — | ~400 |

Avec `claude-sonnet-4-6` (~ $3 / 1M input, $15 / 1M output, cache read ~ 10 % du tarif input) : **~ $0.007 par spec générée** une fois le cache amorcé.

---

## Limites du PoC (assumées)

- **Site calibré démo** : saucedemo.com a des `data-test-id`. Sur un site métier sans hooks de test, la qualité chute.
- **Pas de validation post-génération** : si Claude produit du TS invalide, on s'en aperçoit au `npm test`. Roadmap : valider via `tsc --noEmit` avant écriture.
- **Pas de retries / backoff** : un timeout API casse la commande. À industrialiser.
- **Pas de mode interactif** : un consultant qui veut itérer doit relancer la commande. Une UI Web est l'évolution naturelle.
- **qTest minimal** : import JSON simplifié uniquement. L'intégration qTest Manager API est un projet à part entière.

---

## Liens

- Issue parent : ITE-255 « PlayWright x AI »
- Issue PoC technique : ITE-256
- Issue scénarios : ITE-257 (livrable agent SDET — `test-scenarios/scenarios.json`)
- Site cible : https://www.saucedemo.com
- Anthropic prompt caching : https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
