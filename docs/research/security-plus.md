# CompTIA Security+

Researched 2026-10-20. **No primary source retrieved** — `comptia.org` is blocked by the
build environment's network policy. All findings below are from third-party training
providers.

## Current exam version

**SY0-701** is the version to study for today. It launched November 2023.

**SY0-801 is imminent.** Multiple providers report an expected launch on or around
**17 November 2026**, with SY0-701 remaining valid for English exams through
**11 June 2027**. One source notes CompTIA has slipped release dates by three to six
months before, so treat the date as a plan rather than a fact.

Reported SY0-801 changes: 27 objectives (down from 28), with new dedicated coverage of
Large Language Models under objective 2.4 and AI usage in threats and vulnerabilities
under 2.6. One comparison lists General Security Concepts rising to 16%.

> **Design consequence.** Yahrah targets SY0-701 but keys every content item to an
> objective ID held in `content/objectives/`. Moving to SY0-801 is a content
> migration — swap the spine, re-map the tags, let the validator find the gaps — not a
> rewrite of the game.

## Domains and weights (SY0-701)

Consistent across every source checked, and they sum to 100%:

| Domain | Name | Weight |
|---|---|---|
| 1.0 | General Security Concepts | 12% |
| 2.0 | Threats, Vulnerabilities, and Mitigations | 22% |
| 3.0 | Security Architecture | 18% |
| 4.0 | Security Operations | 28% |
| 5.0 | Security Program Management and Oversight | 20% |

One outlier source shortens domain 5.0 to "Governance". The longer title is used
everywhere else and is what the spine records.

## Objectives

The spine in `content/objectives/securityplus-sy0-701.json` lists **28 objectives**
across the five domains (4 / 5 / 4 / 9 / 6).

**Corroboration:** a source comparing SY0-701 with SY0-801 states SY0-701 has 28
objectives and SY0-801 has 27. The spine's count matches independently.

**Still unverified:** the exact objective wording. The statements in the spine follow
the standard published phrasing but have not been checked character-for-character
against CompTIA's PDF. The sub-bullets beneath each objective (the detailed term lists)
are **not** captured yet and are needed before claiming full coverage.

## Confidence

| Claim | Confidence |
|---|---|
| SY0-701 is current | High |
| Domain names and weights | High — unanimous, sums to 100% |
| 28 objectives, split 4/5/4/9/6 | Medium-high — count independently corroborated |
| Exact objective wording | **Medium — needs primary source** |
| SY0-801 launch and retirement dates | Medium — plans, not commitments |
| Objective sub-bullets | **Not captured** |

## Sources

- https://www.acilearning.com/blog/security-plus-sy0-801-whats-changing-and-when/
- https://trainingcamp.com/articles/comptia-security-sy0-801-release-date-and-everything-we-know-so-far/
- https://accumentum.net/security-plus-sy0-701-vs-sy0-801/
- https://www.certcrush.app/blog/security-plus-sy0-801-vs-sy0-701-whats-changing-2026
- https://destcert.com/ (Security+ exam objectives overview)
- https://www.stationx.net/ (SY0-601 vs SY0-701 breakdown)
