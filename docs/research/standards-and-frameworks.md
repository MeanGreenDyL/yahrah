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

## NIST SP 800 series

Researched 2026-10-20 against NIST's own domains (`nist.gov`, `csrc.nist.gov`,
`nvlpubs.nist.gov`). Direct HTTP to those hosts is still blocked by the build
environment, so these come from search of NIST-hosted documents rather than a full
read of each PDF.

| Publication | Current version | Notes |
|---|---|---|
| **SP 800-61** | **Revision 3**, finalised **3 April 2025** | **Revision 2 is withdrawn**, superseded in its entirety. Rev 3 is framed as a **CSF 2.0 Community Profile**: its recommendations are organised by CSF 2.0 Function, and it states all six Functions have a role in incident response. |
| **SP 800-53** | **Rev 5, Release 5.2.0**, 27 August 2025 | Added controls focused on software updates and patching. The CSRC downloads page still labels 5.1 current and appears stale. No Release 6.0.0 yet. |
| **SP 800-30** | **Revision 1**, September 2012 | Still current. Three-step process: prepare for, conduct, and maintain an assessment. |
| **SP 800-207** | Final, 2020 | Companion **SP 800-207A** shifts focus from network-based controls to identity for cloud-native applications. |

> **This changes a planned design.** SP 800-61 Rev 3 being a CSF 2.0 Community Profile
> means the incident-response content in Yoimura should be organised by CSF Function,
> not by the old four-phase Rev 2 lifecycle (Preparation / Detection and Analysis /
> Containment, Eradication and Recovery / Post-Incident Activity). Teaching the Rev 2
> lifecycle as current would be teaching a withdrawn document.

*Confidence: high on versions and dates. Medium on the detail of Rev 3's structure —
the full PDF has not been read.*

## ISO/IEC 27001

**Still not researched.** From general knowledge, ISO/IEC 27001:2022 is the current
edition with a 2024 amendment on climate change. *Confidence: low — this is recall,
not research, and no content may cite it until checked.*

## Still to research

- MITRE D3FEND current version
- OWASP API Security Top 10 current edition
- ISO/IEC 27001 current edition and amendment status
- Current and emerging tooling (needed for the Dougu tool cards)

## Sources (NIST, added 2026-10-20)

- https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-61r3.pdf
- https://www.nist.gov/news-events/news/2025/04/nist-revises-sp-800-61-incident-response-recommendations-and-considerations
- https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final
- https://csrc.nist.gov/csrc/media/Projects/risk-management/800-53%20Comment%20Site/SP800-53-r5.2.0-changes.pdf
- https://nvlpubs.nist.gov/nistpubs/legacy/sp/nistspecialpublication800-30r1.pdf
- https://nvlpubs.nist.gov/nistpubs/specialpublications/NIST.SP.800-207.pdf
- https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-207A.pdf

## Sources

- https://owasp.org/Top10/2025/
- https://www.esecurityplanet.com/fr/threats/news-owasp-top-10-2025/
- https://cybersecuritynews.com/owasp-top-10-2025/
- https://app.semgrep.dev/blog/2026/owasp-top-10-2025-whats-new
- https://attack.mitre.org/resources/updates/
- https://letsdatascience.com/news/mitre-adds-ai-attack-techniques-to-attck-35cf4042
- https://www.cisecurity.org/controls/v8-1
- https://www.cisecurity.org/about-us/media/press-release/center-for-internet-security-releases-cis-controls-v8-1-with-new-governance-recommendations
