# CLAUDE.md — Yahrah

## Vision

A mobile-first, installable PWA that replaces doom-scrolling with a game worth opening
daily. The player learns cybersecurity from zero to Security+ exam-ready and beyond,
through quests, battles, collecting and hands-on simulated labs. Cozy handheld-RPG
addictiveness, where every level-up is a real skill.

Offline-first. No backend, no accounts, no analytics, no network calls at runtime.

## Stack

Vite · React 18 · TypeScript (strict) · `vite-plugin-pwa` · Zustand · IndexedDB via
`idb` (localStorage fallback) · zod · Vitest · Playwright. Deployed to GitHub Pages.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check then production build |
| `npm run preview` | Serve the build at `/yahrah/` |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc -b` |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright at 390x844 and 1280x800 |
| `npm run validate-content` | Schema + referential integrity over `/content` |
| `npm run verify` | **All of the above. Run before every commit.** |

## Content rules

`content/objectives/` is the **single source of truth** for curriculum IDs. Everything
else references it.

- Every lesson, question, lab, creature and glossary entry **must** tag at least one
  real Security+ objective ID. The validator fails on a dangling reference.
- Every question **must** carry an `explanation` of at least 40 characters, shown
  whether the answer was right or wrong. The teaching is the explanation.
- Every choice carries a `why` — including the wrong ones.
- IDs are lowercase slugs and unique within their collection.
- Sprites are palette-indexed character grids, not image files.
- Simulated network hosts must use RFC 1918 or RFC 5737 documentation addresses. The
  validator rejects anything that looks like a real target.

### Honesty rule

Never invent an objective ID, a CVE, a tool, a statistic or a framework identifier.
If a claim cannot be traced to a note in `docs/research/`, either leave it out or set
`needs_review: true` with a `review_note`. `validate-content` reports the flagged count
on every run. **A flagged item is acceptable; a confidently wrong one is not.**

## Aesthetic rules

- Nostalgic handheld era: chunky pixel UI, limited palette, dialog box with typewriter
  text, screen transitions, menu/party/inventory feel.
- **Everything original.** No copyrighted characters, names, art or music. Village names
  are invented roots plus the common suffix `-mura`. Real *tool* names (Nmap,
  Wireshark, Burp Suite) are used deliberately and correctly — they are curriculum, not
  decoration — with original art.
- `Press Start 2P` for UI chrome only; `Atkinson Hyperlegible` for lesson prose. Pixel
  fonts are unreadable at body size and that fights the accessibility bar.
- Chiptune audio generated with the Web Audio API. **Off by default on first load.** No
  sampled or copyrighted audio.
- Portrait-first, 44px minimum tap targets, safe-area insets, no hover-only
  interaction. Scales to desktop with arrow/WASD, Enter, Esc.
- WCAG AA contrast, screen-reader labels, visible focus, no flashing, reduced-motion
  support, adjustable text size.

## Safety guardrails (non-negotiable)

- Labs teach concepts and techniques **inside sandboxes only**. Nothing may touch a
  real network, host or account. The app makes no runtime network calls at all.
- No working malware, no real targets, no real credentials, no content offering
  meaningful uplift against real systems. Exploitation is taught at the
  concept/technique level with simulated output.
- Every lab carries a `sandboxNotice`. The Three Vows (authorization, scope,
  responsible disclosure) are shown on first run and reachable from the menu.

## The world

Yahrah: a land of seven hidden villages bound by **the Ori**, the Weave. Where it
tears, a **Sakeme** opens and **Kagemono** — manifested threats — pour through. You
collect them, equip **Mamori** (controls) and earn **Dougu** (real tools). Clans:
**Akazora** (red), **Aoyane** (blue), **Fujizome** (purple). Ranks: Itoshi → Oribe →
Kagemi → Tatenushi → Orinushi. Canonical definitions live in `src/world.ts`.

Villages map to Security+ domains: Hakumura (1.0) · Kazanmura (2.0) · Tetsumura (3.0) ·
Yoimura (4.0) · Fumimura (5.0) · Reimura (AI) · Zenimura (crypto).

## Definition of done

A milestone is done when:

1. `npm run verify` passes clean.
2. The UI is exercised with Playwright at **390x844 and 1280x800**, screenshots
   reviewed for overflow, clipping and tap-target problems, and findings fixed.
3. Offline reload works and save export/import round-trips.
4. Content claims are checked against `docs/research/`; anything uncertain is flagged.
5. Committed, with `CLAUDE.md`, `docs/DECISIONS.md` and the roadmap updated.
