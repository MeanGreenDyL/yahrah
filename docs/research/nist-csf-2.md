# NIST Cybersecurity Framework 2.0

Researched 2026-10-20. Direct HTTP to `nist.gov` and `csrc.nist.gov` is blocked by the
build environment's network policy, so NIST's documents were reached by **searching
those domains** rather than fetching them. That is enough to confirm identifiers and
names; it is not enough for full subcategory text.

## Structure

CSF 2.0 has **six Functions**. Govern is the one added in 2.0, and it reframes the
other five around organisational risk management rather than sitting beside them as a
sixth activity.

| Function | Summary |
|---|---|
| **Govern (GV)** | Risk management strategy, expectations and policy are established, communicated and monitored |
| **Identify (ID)** | Current cybersecurity risks are understood |
| **Protect (PR)** | Safeguards to manage those risks are used |
| **Detect (DE)** | Possible attacks and compromises are found and analyzed |
| **Respond (RS)** | Action is taken on a detected incident |
| **Recover (RC)** | Affected assets and operations are restored |

## Categories

**22 categories**, distributed 6 / 3 / 5 / 2 / 4 / 2.

| Function | Categories |
|---|---|
| GV | GV.OC Organizational Context · GV.RM Risk Management Strategy · GV.RR Roles, Responsibilities, and Authorities · GV.PO Policy · GV.OV Oversight · GV.SC Cybersecurity Supply Chain Risk Management |
| ID | ID.AM Asset Management · ID.RA Risk Assessment · ID.IM Improvement |
| PR | PR.AA Identity Management, Authentication, and Access Control · PR.AT Awareness and Training · PR.DS Data Security · PR.PS Platform Security · PR.IR Technology Infrastructure Resilience |
| DE | DE.CM Continuous Monitoring · DE.AE Adverse Event Analysis |
| RS | RS.MA Incident Management · RS.AN Incident Analysis · RS.CO Incident Response Reporting and Communication · RS.MI Incident Mitigation |
| RC | RC.RP Incident Recovery Plan Execution · RC.CO Incident Recovery Communication |

## The 22-vs-23 question: settled

**Resolved 2026-10-20 against NIST's own sources.** A search restricted to `nist.gov`,
`csrc.nist.gov` and `nvlpubs.nist.gov` returned the CSF 2.0 Core table from NIST CSWP 29
and the NIST cyberframework FAQ. Both confirm **22 Categories**, with exactly the
identifiers and names recorded above.

The secondary source titling its table "23 Categories" was simply wrong — its own
per-Function rows summed to 22.

NIST's FAQ also confirms which Categories are new in 2.0: **GV.PO**, **GV.OV**,
**PR.PS** and **ID.IM**.

Subcategory count is reported as ~106. Individual subcategory wording has **not** been
captured and must come from the official publication before any content quotes it.

## Spot-checks that held

- **PR.AA** is titled "Identity Management, Authentication, and Access Control", with
  subcategories PR.AA-01 through PR.AA-06 covering identities, identity proofing,
  authentication of users/services/hardware, access permissions under least privilege,
  and physical access at PR.AA-06.
- **GV.OC** is "Organizational Context" — mission, stakeholder expectations, legal and
  regulatory obligations, dependencies — with GV.OC-01 through GV.OC-05.

## Confidence

| Claim | Confidence |
|---|---|
| Six Functions and their names | **High — confirmed on nist.gov** |
| The 22 category identifiers | **High — confirmed against the CSF 2.0 Core table** |
| Category titles as worded above | **High — match NIST's own table** |
| 22 vs 23 total | **Settled: 22** |
| Subcategory identifiers and wording | **Still not captured** — needs a full read of CSWP 29 |

## Sources

- https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf (the CSF 2.0 publication)
- https://www.nist.gov/system/files/documents/2024/03/25/The_NIST_CSF_2-0_Core_With_Withdrawn_CSF_1-1_Elements.pdf
- https://www.nist.gov/cyberframework/faqs
- https://www.saltycloud.com/blog/nist-csf-controls/
- https://www.saltycloud.com/blog/nist-csf-functions-and-tiers/
- https://www.resiplan.eu/en/blog/nist-csf-categories-table (the 23-category outlier)
- https://www.normgrid.com/nist-csf-2-0/subcategories/
- https://www.nist.gov/document/nist-csf-20-core-withdrawn-csf-11-elements (reachable only via search summary)
- https://nhimg.org/nist-cybersecurity-framework-2-0-guide
