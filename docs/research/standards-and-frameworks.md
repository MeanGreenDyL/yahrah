# Standards and frameworks

Researched 2026-10-20. No primary sources retrieved (network policy).

## OWASP Top 10 (Web) — 2025 edition

**The 2025 edition is current**, reported released 6 November 2025. This matters:
training material written against the long-standing 2021 list is now out of date.

| ID | Risk |
|---|---|
| A01 | Broken Access Control |
| A02 | Security Misconfiguration |
| A03 | Software Supply Chain Failures *(new)* |
| A04 | Cryptographic Failures |
| A05 | Injection |
| A06 | Insecure Design |
| A07 | Authentication Failures |
| A08 | Software or Data Integrity Failures |
| A09 | Security Logging and Alerting Failures |
| A10 | Mishandling of Exceptional Conditions *(new)* |

Notable: **SSRF has been folded into A01**, on the reasoning that it is fundamentally
an access-control problem. A03 and A10 are the two new entries.

*Confidence: medium-high on the list and ordering. One source calls the November 2025
publication a draft; others call it released. Verify before teaching the ordering as
settled.*

## MITRE ATT&CK

**v20**, reported published **13 October 2026** — one week before this research.
Enterprise matrix reported at 15 tactics, 227 techniques, 479 sub-techniques.

Two changes matter for anything that maps to ATT&CK:

- **v19 (April 2026) split the Defense Evasion tactic** into *Stealth* and *Defense
  Impairment*. Older mappings that reference Defense Evasion are stale.
- **v20 added AI-related techniques**, reported as T1699 Direct Prompt Injection,
  T1698 Indirect Prompt Injection and T1700 AI-Enabled Exfiltration.

*Confidence: medium. The technique IDs come from a single source and are exactly the
kind of detail worth getting wrong. Do not put these IDs in content until verified
against attack.mitre.org.*

## CIS Controls

**v8.1**, released June 2024. An iterative update to v8: adds a **Govern** security
function (borrowed from NIST CSF 2.0), revises asset classes, and corrects Safeguard
descriptions. Control IDs and Implementation Groups are unchanged from v8. Still 18
controls.

*Confidence: high.*

## ISO/IEC 27001 and NIST SP 800-53

**Not covered by the searches run.** From general knowledge, ISO/IEC 27001:2022 is the
current edition with a 2024 amendment on climate change, and NIST SP 800-53 Rev 5 is the
current major revision with point releases since 2023.

*Confidence: low — this is recall, not research. Must be verified before any content
cites a revision number.*

## Still to research

- NIST SP 800-61 (incident handling) current revision — **Rev 3 status unconfirmed**
- NIST SP 800-30 (risk assessment), 800-207 (Zero Trust) current revisions
- MITRE D3FEND current version
- OWASP API Security Top 10 current edition
- Current and emerging tooling (needed for the Dougu tool cards)

## Sources

- https://owasp.org/Top10/2025/
- https://www.esecurityplanet.com/fr/threats/news-owasp-top-10-2025/
- https://cybersecuritynews.com/owasp-top-10-2025/
- https://app.semgrep.dev/blog/2026/owasp-top-10-2025-whats-new
- https://attack.mitre.org/resources/updates/
- https://letsdatascience.com/news/mitre-adds-ai-attack-techniques-to-attck-35cf4042
- https://www.cisecurity.org/controls/v8-1
- https://www.cisecurity.org/about-us/media/press-release/center-for-internet-security-releases-cis-controls-v8-1-with-new-governance-recommendations
