# Roadmap

## Done

- **M0 — Foundation.** Vite/React/TS scaffold, PWA config, Security+ SY0-701 and NIST
  CSF 2.0 objective spines, zod content schemas, `validate-content` with referential
  integrity and safety checks, generated PWA icons, research notes, CI and Pages deploy.

- **M1 — Design system, shell, PWA, save.** Pixel UI kit (Panel, Button, Menu, Meter,
  DialogBox with typewriter text, canvas Sprite renderer), self-hosted fonts, chiptune
  engine (silent until explicitly enabled), IndexedDB save with localStorage fallback,
  versioned migrations, JSON export/import, corrupt-save recovery, XP curve, streaks,
  and the Three Vows gate. Title, Vows, Home, Settings and Codex screens.

- **M2 — Overworld and progression.** 24x24 tile overworld with a thumb D-pad and
  arrow/WASD control, seven village gates (reachability proven by test), progress
  dashboard with mastery per Security+ domain and per CSF 2.0 Function, weak-area
  ranking, syllabus coverage, a weighted exam-readiness score, and eight badges.

## Next
- **M3 — Battle engine and spaced repetition.** Turn-based Kagemono encounters with
  Mamori loadouts and type effectiveness, SM-2-style scheduler, missed concepts
  returning as wild encounters, explanations after every answer.
- **M4 — Lab engines.** Simulated terminal (fake filesystem and network, command
  parser, scanning output, privilege-escalation puzzle), SIEM-style log analysis,
  phishing triage.
- **M5 — Hakumura.** One complete village: ~5 lessons on General Security Concepts,
  battles, one of each lab, a boss fight, ~15 Kagemono/Mamori/Dougu.
- **M6 — Polish and ship.** Animation and audio pass, accessibility audit, visual QA at
  both viewports, live on Pages and installable on a phone.

## After M6 — remaining villages

| Village | Teaches | Notes |
|---|---|---|
| **Kazanmura** | Threats, Vulnerabilities and Mitigations (2.0, 22%) | Largest threat-actor and malware collection |
| **Tetsumura** | Security Architecture (3.0, 18%) | Firewall/ACL builder, network topology puzzles, Zero Trust (SP 800-207) |
| **Yoimura** | Security Operations (4.0, 28%) | Biggest domain. SIEM, detection engineering, IR (SP 800-61), forensics, Sigma rule builder, purple-team mode |
| **Fumimura** | Program Management and Oversight (5.0, 20%) | Risk (SP 800-30), third-party risk, audits, compliance, ISO 27001, CIS Controls |
| **Reimura** | AI security | OWASP LLM Top 10, MITRE ATLAS, the vulnerable simulated chatbot lab |
| **Zenimura** | Cryptography and blockchain | Cipher/hash cracking in-sim, wallet hygiene, smart-contract vulnerability classes, post-quantum basics |

## Cross-cutting, after the villages

- Timed mock Security+ exam with performance-based-style questions
- CTF challenge ladder with escalating difficulty and hints
- Career tracks: pentest methodology, blue team, red team, purple team, grey-hat ethics
- Full Dougu tool encyclopedia (Nmap, Wireshark, Burp, Metasploit, Kali, John/Hashcat,
  Splunk/Elastic, Wazuh, Velociraptor, Sigma/YARA, Ghidra, plus verified emerging tools)
- Incident-response branching scenarios mapped to CSF Respond/Recover

## Open research debt

Tracked in `docs/research/`. The big one: **no primary source has been reachable** from
the build environment. Objective wording, CSF category titles, ATT&CK technique IDs and
ATLAS versions all need confirming against the authoritative documents before the
content leaves `needs_review`.
