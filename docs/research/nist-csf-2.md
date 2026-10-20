# NIST Cybersecurity Framework 2.0

Researched 2026-10-20. **No primary source retrieved** — `nist.gov` and `csrc.nist.gov`
are blocked by the build environment's network policy.

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

## The one disagreement

One secondary source titles its table "6 Functions and 23 Categories" while its own
per-Function rows sum to 22. Every other source checked gives 22, and the identifier
list above sums to 22. **The spine records 22 and flags this for primary-source
confirmation.**

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
| Six Functions and their names | High |
| The 22 category identifiers | Medium-high — consistent, and the per-Function counts sum correctly |
| Category titles as worded above | **Medium — needs primary source** |
| 22 vs 23 total | **Medium — one source disagrees with itself** |
| Subcategory wording | **Not captured** |

## Sources

- https://www.saltycloud.com/blog/nist-csf-controls/
- https://www.saltycloud.com/blog/nist-csf-functions-and-tiers/
- https://www.resiplan.eu/en/blog/nist-csf-categories-table (the 23-category outlier)
- https://www.normgrid.com/nist-csf-2-0/subcategories/
- https://www.nist.gov/document/nist-csf-20-core-withdrawn-csf-11-elements (reachable only via search summary)
- https://nhimg.org/nist-cybersecurity-framework-2-0-guide
