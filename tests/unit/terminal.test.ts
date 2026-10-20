import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  startTerminal,
  runCommand,
  isComplete,
  normalisePath,
  resolvePath,
  nodeAt,
  modeToSymbolic,
  isWorldReadable,
  type TerminalState,
} from '@/labs/terminal'
import { labSchema, type TerminalLab } from '@/content/schemas'

const raw = JSON.parse(
  readFileSync(
    join(import.meta.dirname, '..', '..', 'content', 'labs', 'hakumura-terminal.json'),
    'utf8',
  ),
)
const LAB = labSchema.parse(raw[0]) as TerminalLab

function run(state: TerminalState, ...commands: string[]): TerminalState {
  return commands.reduce((s, c) => runCommand(s, LAB, c), state)
}

function lastOutput(state: TerminalState): string {
  return state.lines
    .slice(state.lines.lastIndexOf([...state.lines].reverse().find((l) => l.kind === 'input')!) + 1)
    .map((l) => l.text)
    .join('\n')
}

describe('path handling', () => {
  it('normalises . and ..', () => {
    expect(normalisePath('/a/b/../c')).toBe('/a/c')
    expect(normalisePath('/a/./b')).toBe('/a/b')
    expect(normalisePath('/a/b/../..')).toBe('/')
  })

  it('cannot escape above the root', () => {
    expect(normalisePath('/../../../etc')).toBe('/etc')
    expect(normalisePath('/..')).toBe('/')
  })

  it('resolves relative against the working directory', () => {
    expect(resolvePath('/home/itoshi', 'notes.txt')).toBe('/home/itoshi/notes.txt')
    expect(resolvePath('/home/itoshi', '..')).toBe('/home')
    expect(resolvePath('/home/itoshi', '/etc')).toBe('/etc')
  })

  it('finds nodes and returns null for missing paths', () => {
    expect(nodeAt(LAB.host.filesystem, '/etc/passwd')?.type).toBe('file')
    expect(nodeAt(LAB.host.filesystem, '/nope/nothing')).toBeNull()
  })
})

describe('permission rendering', () => {
  it('renders modes symbolically', () => {
    expect(modeToSymbolic('644', false)).toBe('-rw-r--r--')
    expect(modeToSymbolic('755', true)).toBe('drwxr-xr-x')
    expect(modeToSymbolic('600', false)).toBe('-rw-------')
    expect(modeToSymbolic('777', true)).toBe('drwxrwxrwx')
  })

  it('identifies world-readable files', () => {
    expect(isWorldReadable({ name: 'a', type: 'file', mode: '644' })).toBe(true)
    expect(isWorldReadable({ name: 'a', type: 'file', mode: '640' })).toBe(false)
    expect(isWorldReadable({ name: 'a', type: 'file', mode: '600' })).toBe(false)
  })
})

describe('the shell', () => {
  const fresh = () => startTerminal(LAB)

  it('opens with the sandbox notice', () => {
    expect(fresh().lines[0].text).toMatch(/simulation/i)
  })

  it('starts in the user home directory', () => {
    expect(fresh().cwd).toBe('/home/itoshi')
    expect(lastOutput(run(fresh(), 'pwd'))).toBe('/home/itoshi')
  })

  it('lists and changes directory', () => {
    const state = run(fresh(), 'cd /srv/gatehouse', 'ls')
    expect(state.cwd).toBe('/srv/gatehouse')
    expect(lastOutput(state)).toContain('rota.csv')
  })

  it('rejects cd into a file', () => {
    expect(lastOutput(run(fresh(), 'cd README'))).toMatch(/Not a directory/)
  })

  it('reports a missing path rather than crashing', () => {
    expect(lastOutput(run(fresh(), 'cd /does/not/exist'))).toMatch(/No such file/)
    expect(lastOutput(run(fresh(), 'cat /nope'))).toMatch(/No such file/)
  })

  it('reads a world-readable file', () => {
    expect(lastOutput(run(fresh(), 'cat /etc/passwd'))).toContain('gate-svc')
  })

  it('refuses a file the user may not read', () => {
    expect(lastOutput(run(fresh(), 'cat /etc/shadow'))).toMatch(/Permission denied/)
  })

  it('lets the owner read their own non-world-readable file', () => {
    expect(lastOutput(run(fresh(), 'cat /home/itoshi/notes.txt'))).toContain('Gatehouse rota')
  })

  it('shows permissions with ls -l', () => {
    const state = run(fresh(), 'cd /srv/gatehouse', 'ls -l')
    expect(lastOutput(state)).toMatch(/drwxrwxrwx\s+root\s+staff\s+shared/)
  })

  it('finds world-readable files under a path', () => {
    const state = run(fresh(), 'find /srv -perm')
    expect(lastOutput(state)).toContain('/srv/gatehouse/shared/gate-svc.conf')
  })

  it('greps inside a file', () => {
    const state = run(fresh(), 'grep password /srv/gatehouse/shared/gate-svc.conf')
    expect(lastOutput(state)).toMatch(/password/)
  })

  it('reports unknown commands helpfully', () => {
    const state = run(fresh(), 'rm -rf /')
    expect(lastOutput(state)).toMatch(/command not found/)
    expect(lastOutput(state)).toMatch(/help/)
  })

  it('never crashes on malformed input', () => {
    const nasties = ['', '   ', 'cat', 'cd', 'grep', 'find /nope', 'nmap', 'sudo', '!!!', 'ls -l -l -l']
    let state = fresh()
    for (const n of nasties) {
      expect(() => (state = runCommand(state, LAB, n))).not.toThrow()
    }
  })

  it('does not mutate the state it is given', () => {
    const before = fresh()
    const lineCount = before.lines.length
    runCommand(before, LAB, 'ls')
    expect(before.lines.length).toBe(lineCount)
  })
})

describe('the simulated scanner', () => {
  it('reports ports for a host in the simulation', () => {
    const state = run(startTerminal(LAB), 'nmap 192.0.2.40')
    const text = lastOutput(state)
    expect(text).toContain('8443/tcp')
    expect(text).toContain('https')
  })

  it('reports nothing for a host outside the simulation', () => {
    const state = run(startTerminal(LAB), 'nmap 8.8.8.8')
    expect(lastOutput(state)).toMatch(/not part of the simulation/)
  })

  it('every host in the lab is a documentation or private address', () => {
    for (const host of LAB.host.network) {
      expect(host.ip).toMatch(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|192\.0\.2\.|198\.51\.100\.|203\.0\.113\.)/)
    }
  })
})

describe('goals', () => {
  it('starts with none met', () => {
    expect(startTerminal(LAB).goalsMet).toEqual([])
    expect(isComplete(startTerminal(LAB), LAB)).toBe(false)
  })

  it('completes when the intended path is walked', () => {
    const state = run(
      startTerminal(LAB),
      'ls -l /srv/gatehouse',
      'find /srv -perm',
      'cat /srv/gatehouse/shared/gate-svc.conf',
    )
    expect(isComplete(state, LAB)).toBe(true)
    expect(state.goalsMet.sort()).toEqual(['find-readable', 'look', 'read-config'])
  })

  it('does not award a goal twice', () => {
    const state = run(startTerminal(LAB), 'find /srv -perm', 'find /srv -perm')
    expect(state.goalsMet.filter((g) => g === 'find-readable')).toHaveLength(1)
  })

  it('ignores commands that do not match a goal', () => {
    expect(run(startTerminal(LAB), 'pwd', 'whoami').goalsMet).toEqual([])
  })
})

describe('escalation is gated', () => {
  it('refuses sudo before anything has been discovered', () => {
    const state = run(startTerminal(LAB), 'sudo cat /etc/shadow')
    expect(lastOutput(state)).toMatch(/not in the sudoers file/)
    expect(state.elevated).toBe(false)
  })

  it('whoami reflects the unescalated user', () => {
    expect(lastOutput(run(startTerminal(LAB), 'whoami'))).toBe('itoshi')
  })
})

describe('safety', () => {
  it('the lab content restates that it is simulated', () => {
    expect(LAB.sandboxNotice).toMatch(/simulation|simulated/i)
  })

  it('no credential in the content is a usable secret', () => {
    const text = JSON.stringify(LAB)
    expect(text).toMatch(/REDACTED-IN-SIMULATION/)
  })
})
