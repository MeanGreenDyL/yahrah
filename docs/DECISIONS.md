# Decisions

Autonomous calls made while building Yahrah, with reasoning. Newest last.

## D1 — Separate repo, not a folder in the portfolio site

`MeanGreenDyL/yahrah` rather than a subdirectory of `Dylan.media`. The game needs its
own deploy target, its own base path and its own dependency tree; nesting it inside a
Next.js portfolio would entangle all three.

## D2 — Target SY0-701, with a migration path to SY0-801

SY0-801 is expected around 17 November 2026 — roughly a month out. SY0-701 is what you
would sit today and stays valid to ~June 2027.

Rather than bet on either, the curriculum spine lives in
`content/objectives/securityplus-sy0-701.json` and **every** content item references an
objective ID from it. Switching to SY0-801 means swapping the spine and re-tagging;
the validator then lists every item that no longer maps. A content migration, not a
rewrite.

## D3 — Two fonts, not one

`Press Start 2P` (OFL) for UI chrome and headings; `Atkinson Hyperlegible` (OFL) for
lesson prose.

The brief asked for chunky pixel fonts *and* WCAG AA accessibility. Those genuinely
conflict for body text — Press Start 2P has no lowercase descender clarity and becomes
painful past a sentence or two, especially on a phone. Splitting the roles keeps the
handheld look where it carries the mood (titles, menus, labels) and keeps the actual
teaching readable. Both are open-licence and self-hosted, so the app stays offline-capable.

## D4 — Sprites as data, not image files

Creature and tile art is stored in content JSON as palette-indexed character grids and
rendered to `<canvas>`. No PNG/SVG assets for game art.

Reasons: provably original (there is nothing to accidentally copy), diffable in review,
tiny in the service-worker cache, and testable — the schema validates grid dimensions
and rejects a colour key missing from the palette. The PWA icons are the one exception,
and they are generated from a computed glyph by `scripts/gen-icons.mjs`.

## D5 — The validator enforces the safety guardrail, not just the schema

`validate-content` rejects any simulated host whose IP is outside RFC 1918 or RFC 5737
documentation ranges. It would be easy to write a lab that names `8.8.8.8` as a target
out of convenience; making that a build failure means the "nothing touches a real
system" rule is mechanically enforced rather than merely intended. Covered by a test.

## D6 — Ninja-village naming, original roots

Place names use invented roots plus `-mura` ("village"), a common Japanese noun —
Hakumura, Kazanmura, Tetsumura, Yoimura, Fumimura, Reimura, Zenimura. Clan and rank
names are likewise invented compounds.

Deliberately avoided: every proper noun from existing ninja fiction, and the `-gakure`
construction, which is too closely identified with one franchise. Generic Japanese
common nouns (`mura`, `tetsu`, `kage`) are not anyone's IP; specific invented place and
character names are. Real *tool* names are used on purpose — they are the curriculum.

## D7 — Content dir overridable for tests

`validate-content` honours `YAHRAH_CONTENT_DIR`. This exists so the test suite can run
the real validator against fixture trees containing deliberately broken content, and
assert it exits non-zero. Without it, "the validator catches bad refs" would be a claim
rather than a test.

## D8 — Deployed from `main` to GitHub Pages

Agreed with Dylan: public repo, GitHub Pages, Actions-based deploy. Public is required
because Pages on a private repo needs a paid plan, and a learning game has nothing
sensitive in it. `base` is `/yahrah/`, overridable via `VITE_BASE` for root-domain hosts
if we ever move to Cloudflare Pages or Netlify.
