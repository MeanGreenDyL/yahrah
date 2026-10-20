# AI security

Researched 2026-10-20. No primary sources retrieved (network policy).

## OWASP Top 10 for LLM Applications — 2025 (v2.0)

Published **18 November 2024** by the OWASP GenAI Security Project. No 2026 revision
found; the 2025 edition appears current.

| ID | Risk |
|---|---|
| LLM01 | Prompt Injection |
| LLM02 | Sensitive Information Disclosure |
| LLM03 | Supply Chain |
| LLM04 | Data and Model Poisoning |
| LLM05 | Improper Output Handling |
| LLM06 | Excessive Agency |
| LLM07 | System Prompt Leakage *(new in 2025)* |
| LLM08 | Vector and Embedding Weaknesses *(new in 2025)* |
| LLM09 | Misinformation |
| LLM10 | Unbounded Consumption |

**Unbounded Consumption** replaced the earlier Denial of Service entry, broadening it to
cover resource management and unexpected cost.

A separate **OWASP Top 10 for Agentic Applications** exists for multi-step autonomous
agents and layers on top of this list. Not yet researched.

*Confidence: high on the list and ordering.*

## MITRE ATLAS

**The sources disagree, so nothing here is safe to teach yet.**

- One source: ATLAS 2026.05, last modified 27 May 2026, ~101 techniques.
- Another: release v2026.09, published 15 September 2026, 120 techniques, 73 case
  studies — and states ATLAS now ships **monthly**, so any pinned count goes stale fast.

They agree on **16 tactics**, fourteen inherited from ATT&CK and two specific to AI.
They disagree on the names of those two: one gives "AI Model Access" and "AI Attack
Adaptation", the other "AI Attack Staging".

*Confidence: **low**. Every ATLAS-specific claim must be flagged `needs_review: true`
until atlas.mitre.org is reachable. Teach the shape of the framework, not its counts.*

## Planned Reimura curriculum

The AI-security village covers: prompt injection (direct and indirect), jailbreaks,
data and model poisoning, model theft, insecure agent and tool use, AI-powered phishing
and deepfakes, ML pipeline security, and AI used for defence.

The flagship lab is a **deliberately vulnerable simulated chatbot**: break it with
prompt injection, then patch it. The "model" is a scripted state machine in the content
files — there is no real LLM, no API call, and no network traffic. The vulnerability is
a teaching fixture, not a working technique against any real system.

## Sources

- https://genai.owasp.org/2024/11/17/owasp-reveals-updated-2025-top-10-risks-for-llms-announces-new-llm-project-sponsorship-program-and-inaugural-sponsors/
- https://www.hackerone.com/blog/owasp-top-10-llms-2025-how-genai-risks-are-evolving
- https://coralogix.com/ai-blog/owasp-top-10-for-llm-applications/
- https://help.hcl-software.com/appscan/Enterprise/10.10.0/topics/r_owasp_top_10_for_llm.html
- https://docs.modulos.ai/frameworks/owasp-top-10-llm
- https://cyberdefenders.org/cybersecurity-glossary/mitre-atlas/
- https://www.akto.io/blog/mitre-atlas-agentic-ai
- https://layerxsecurity.com/learn/mitre-atlas/
