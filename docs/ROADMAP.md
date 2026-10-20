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

- **M3 — Battle engine and spaced repetition.** Turn-based Kagemono encounters with a
  seven-element effectiveness cycle, an SM-2 scheduler with capped intervals, a daily
  session built from due cards topped up with unseen questions, shuffled answer
  choices, and an explanation after every answer covering every choice. Ten Security+
  questions and seven creatures as the first real content.

- **M4 — Lab engines.** Three simulated engines, all content-driven and all pure
  functions over data: a terminal (fake filesystem and network, command parser,
  permissions, an in-sim scanner), a SIEM-style log viewer with filter, sort and
  flagging, and phishing triage over headers, links and attachments.

- **M5 — Hakumura.** One complete village, playable end to end: five lessons on
  General Security Concepts, three hands-on labs, a boss fight, and seven creatures.
  Nodes unlock in order. Proven by an e2e test that plays all nine nodes through at
  both viewports.

- **M6 — Polish and accessibility.** WCAG AA contrast computed from the palette tokens
  in a unit test (and one real failure fixed), an accessibility audit across every
  screen at both viewports, 44px tap targets, text scaling to 1.6x without overflow,
  reduced-motion support, and the deploy pipeline.

## Next

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

Tracked in `docs/research/`.

**Settled since M0:** the CSF 2.0 category count (22, confirmed against NIST's own
Core), the Security+ domain names, weights and objective count (confirmed on
comptia.org), and the current revisions of SP 800-61 (Rev 3 — Rev 2 is withdrawn),
800-53, 800-30 and 800-207.

**Still outstanding:** CompTIA's exact objective wording and sub-bullet term lists;
NIST's ~106 subcategory identifiers and text; MITRE ATT&CK technique IDs; the MITRE
ATLAS version and tactic names; ISO/IEC 27001's current edition. All need the primary
documents, and anything resting on them stays flagged.
