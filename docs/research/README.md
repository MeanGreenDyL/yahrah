# Research notes

Everything in `/content` traces back to a note in this folder. Each note separates
**what was verified**, **what was corroborated but unverified**, and **what is still
open**. Content that rests on an unverified claim carries `needs_review: true`, and
`npm run validate-content` reports the count on every run.

## Method

Research was done on **2026-10-20**, in three tiers of decreasing confidence.

1. **Primary documents, read directly.** The curriculum spines now rest on these:
   CompTIA's official SY0-701 exam objectives (Objectives Version 5.0) and NIST's own
   CPRT export of the CSF 2.0 Core, both supplied as files. These were read, not
   summarised.
2. **Publishers' own pages, via search.** Direct HTTP to `comptia.org` and `nist.gov`
   is blocked by the build environment's network policy, but web *search* reaches those
   domains. Used for the SP 800 series revisions.
3. **Third-party sources.** Everything still outstanding below.

Where independent sources agree, and where an internal cross-check holds (objective
counts, domain weights summing to 100%, CSF category counts summing per Function),
confidence is reasonable. Where sources disagree, that is recorded rather than
resolved by guessing.

**Both spines are now `verified-primary-source`.** What remains at tier 2 or 3 is listed
under "Still outstanding" in each note.

## Notes

| File | Covers |
|---|---|
| `security-plus.md` | CompTIA Security+ exam version, domains, objectives |
| `nist-csf-2.md` | NIST CSF 2.0 Functions and Categories |
| `standards-and-frameworks.md` | OWASP, MITRE ATT&CK, CIS Controls, ISO 27001, NIST SP series |
| `ai-security.md` | OWASP Top 10 for LLMs, MITRE ATLAS, AI threat landscape |

## Standing rule

Never invent an objective ID, a CVE, a tool, a statistic or a framework identifier. If
it cannot be sourced, it does not go in the content — or it goes in flagged.
