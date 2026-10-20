# Research notes

Everything in `/content` traces back to a note in this folder. Each note separates
**what was verified**, **what was corroborated but unverified**, and **what is still
open**. Content that rests on an unverified claim carries `needs_review: true`, and
`npm run validate-content` reports the count on every run.

## Method, and its limitation

Research was done on **2026-10-20** using web search.

**The build environment's network policy blocks direct access to primary sources.**
`comptia.org`, `nist.gov`, `csrc.nist.gov`, `owasp.org`, `attack.mitre.org` and
`cisecurity.org` all fail to resolve from the container. Every fact below therefore
comes from search-result summaries and secondary training-provider sites, not from the
authoritative document.

Where independent sources agree, and where an internal cross-check holds (objective
counts, domain weights summing to 100%, CSF category counts summing per Function),
confidence is reasonable. Where sources disagree, that is recorded rather than
resolved by guessing.

**To close this gap:** allow those domains in the environment's network settings, then
re-run the verification pass and flip each spine's `verification.status` to
`verified-primary-source`.

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
