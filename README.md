# Yahrah — Wardens of the Weave

A cybersecurity learning RPG. Train from zero to CompTIA Security+ ready and beyond
through quests, battles, collecting and hands-on simulated labs — in a mobile-first,
installable, offline-capable PWA.

> **Everything here is simulated.** No lab in this game touches a real network, host or
> account. See [The Three Vows](#safety) below.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173/yahrah/
```

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript project build |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright at phone (390x844) and desktop (1280x800) |
| `npm run validate-content` | Validate `/content` schemas and cross-references |
| `npm run verify` | Everything above, in order |

## Deploying to GitHub Pages

The repository ships a workflow at `.github/workflows/deploy.yml` that builds and
publishes on every push to `main`.

**One-time setup:**

1. The repository must be **public** — GitHub Pages on a private repo requires a paid
   plan. *Settings → General → Danger Zone → Change repository visibility.*
2. *Settings → Pages → Build and deployment → Source:* select **GitHub Actions**.
3. Push to `main`. The workflow builds and deploys.

The site lands at **https://meangreendyl.github.io/yahrah/**.

**On your phone:** open that URL, then *Share → Add to Home Screen* (iOS) or
*⋮ → Install app* (Android). It then launches fullscreen and works offline.

### Hosting somewhere else

The build hardcodes nothing. For a root-domain host (Cloudflare Pages, Netlify), build
with `VITE_BASE=/`:

```bash
VITE_BASE=/ npm run build
```

Publish directory is `dist`, build command `npm run build`.

## Project layout

```
content/objectives/   curriculum spine - the single source of truth for IDs
content/              lessons, questions, labs, creatures, zones, glossary
src/world.ts          canonical lore: villages, clans, ranks, the Three Vows
src/content/          zod schemas and typed loaders
src/ui/               pixel UI kit
src/engine/           xp, spaced repetition, scoring, battle, save
src/labs/             terminal, log-analysis and phishing-triage engines
scripts/              content validator, icon generator
docs/research/        sourced research notes, with confidence levels
docs/DECISIONS.md     autonomous calls and their reasoning
```

## Curriculum

Content is tagged to **CompTIA Security+ SY0-701** objective IDs and **NIST CSF 2.0**
Functions and Categories. `npm run validate-content` fails the build on any reference
to an objective that does not exist, so content cannot silently drift from the exam.

Research notes, with explicit confidence levels and the gaps still open, are in
[`docs/research/`](docs/research/README.md).

## Safety

Yahrah teaches offensive technique at the concept level, inside a simulation. It
contains no working malware, no real targets and no real credentials, and it makes no
network calls at runtime. Every lab restates its sandbox boundary, and the in-game
charter — **The Three Vows**: Mandate, Bounds, Telling — covers authorization, scope and
responsible disclosure.

## Status

M0 complete: scaffold, curriculum spine, content schema and validator, CI.
See [`docs/ROADMAP.md`](docs/ROADMAP.md).
