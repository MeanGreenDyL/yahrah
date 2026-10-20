import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, cpSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const REPO = join(import.meta.dirname, '..', '..')
const SCRIPT = join(REPO, 'scripts', 'validate-content.ts')

/** Run the validator against a content tree, returning exit code + output. */
function runValidator(contentDir: string): { code: number; output: string } {
  try {
    const output = execFileSync('npx', ['tsx', SCRIPT], {
      cwd: REPO,
      env: { ...process.env, YAHRAH_CONTENT_DIR: contentDir },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { code: 0, output }
  } catch (err) {
    const e = err as { status?: number; stdout?: string; stderr?: string }
    return { code: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` }
  }
}

/** A fixture tree that reuses the real objective spine. */
function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'yahrah-content-'))
  mkdirSync(join(dir, 'objectives'), { recursive: true })
  cpSync(join(REPO, 'content', 'objectives'), join(dir, 'objectives'), { recursive: true })
  for (const sub of ['questions', 'lessons', 'labs', 'creatures', 'zones', 'glossary', 'bosses']) {
    mkdirSync(join(dir, sub), { recursive: true })
  }
  return dir
}

const validQuestion = {
  id: 'q-control-types',
  type: 'single',
  prompt: 'A locked server-room door is best described as which category of control?',
  explanation:
    'A locked door physically prevents access, so it is a physical, preventive control. Categories describe where a control lives; types describe what it does.',
  difficulty: 1,
  choices: [
    { id: 'a', text: 'Physical', why: 'Correct - it is a tangible barrier in the real world.' },
    { id: 'b', text: 'Technical', why: 'Technical controls are implemented in hardware or software logic.' },
    { id: 'c', text: 'Managerial', why: 'Managerial controls are policies and procedures.' },
  ],
  answer: 'a',
  tags: { objectives: ['SP.1.1'], csf: ['PR.AA'], frameworks: [] },
  sources: [],
}

describe('validate-content', () => {
  it('passes on a well-formed content tree', () => {
    const dir = makeFixture()
    try {
      writeFileSync(join(dir, 'questions', 'q.json'), JSON.stringify([validQuestion], null, 2))
      const { code, output } = runValidator(dir)
      expect(output).toContain('All content valid')
      expect(code).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails on a dangling Security+ objective reference', () => {
    const dir = makeFixture()
    try {
      const broken = { ...validQuestion, tags: { ...validQuestion.tags, objectives: ['SP.9.9'] } }
      writeFileSync(join(dir, 'questions', 'q.json'), JSON.stringify([broken], null, 2))
      const { code, output } = runValidator(dir)
      expect(code).toBe(1)
      expect(output).toContain('unknown Security+ objective "SP.9.9"')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails on an unknown NIST CSF reference', () => {
    const dir = makeFixture()
    try {
      const broken = { ...validQuestion, tags: { ...validQuestion.tags, csf: ['PR.ZZ'] } }
      writeFileSync(join(dir, 'questions', 'q.json'), JSON.stringify([broken], null, 2))
      const { code, output } = runValidator(dir)
      expect(code).toBe(1)
      expect(output).toContain('unknown NIST CSF 2.0 reference "PR.ZZ"')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails when an answer is not among the choices', () => {
    const dir = makeFixture()
    try {
      const broken = { ...validQuestion, answer: 'z' }
      writeFileSync(join(dir, 'questions', 'q.json'), JSON.stringify([broken], null, 2))
      const { code, output } = runValidator(dir)
      expect(code).toBe(1)
      expect(output).toContain('is not one of the choices')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails when a question has no explanation', () => {
    const dir = makeFixture()
    try {
      const broken = { ...validQuestion, explanation: 'too short' }
      writeFileSync(join(dir, 'questions', 'q.json'), JSON.stringify([broken], null, 2))
      const { code } = runValidator(dir)
      expect(code).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails on duplicate ids across files', () => {
    const dir = makeFixture()
    try {
      writeFileSync(join(dir, 'questions', 'a.json'), JSON.stringify([validQuestion], null, 2))
      writeFileSync(join(dir, 'questions', 'b.json'), JSON.stringify([validQuestion], null, 2))
      const { code, output } = runValidator(dir)
      expect(code).toBe(1)
      expect(output).toContain('duplicate question id')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('rejects a lab that names a real-world network target', () => {
    const dir = makeFixture()
    try {
      const lab = {
        id: 'lab-bad-target',
        engine: 'terminal',
        title: 'Scan the gate',
        brief: 'A simulated reconnaissance exercise inside the village training ground.',
        sandboxNotice: 'Everything here is simulated. No real host is ever contacted.',
        objectiveText: 'Enumerate the open ports on the training host.',
        hints: [],
        debrief: 'Port scanning reveals which services are listening, which is the first step of enumeration.',
        xp: 50,
        host: {
          hostname: 'training',
          user: 'itoshi',
          cwd: '/home/itoshi',
          filesystem: { name: '/', type: 'dir', children: [] },
          network: [
            { ip: '8.8.8.8', hostname: 'real-world', ports: [{ port: 53, proto: 'udp', state: 'open', service: 'dns' }] },
          ],
        },
        goals: [{ id: 'g1', description: 'Scan the host', whenCommandMatches: '^nmap' }],
        tags: { objectives: ['SP.4.3'], csf: ['ID.RA'], frameworks: [] },
        sources: [],
      }
      writeFileSync(join(dir, 'labs', 'lab.json'), JSON.stringify([lab], null, 2))
      const { code, output } = runValidator(dir)
      expect(code).toBe(1)
      expect(output).toContain('labs must never name real targets')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
