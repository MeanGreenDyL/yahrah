import type { FsNode, TerminalLab } from '@/content/schemas'

/**
 * A simulated terminal.
 *
 * Nothing here touches a real filesystem, process or network. The "machine"
 * is a tree of plain objects from a content file, and every command is a
 * pure function over it. That is a safety property, not an implementation
 * detail: see the guardrails in CLAUDE.md.
 */

export type LineKind = 'input' | 'output' | 'error' | 'note'
export type Line = { kind: LineKind; text: string }

export type TerminalState = {
  cwd: string
  user: string
  hostname: string
  lines: Line[]
  /** Ids of goals satisfied so far. */
  goalsMet: string[]
  /** Commands entered, for history and for goal matching. */
  history: string[]
  /** Whether the player has escalated in-sim. */
  elevated: boolean
}

export function startTerminal(lab: TerminalLab): TerminalState {
  return {
    cwd: lab.host.cwd,
    user: lab.host.user,
    hostname: lab.host.hostname,
    lines: [
      { kind: 'note', text: lab.sandboxNotice },
      { kind: 'output', text: `Connected to ${lab.host.hostname} (simulated).` },
      { kind: 'output', text: "Type 'help' for available commands." },
    ],
    goalsMet: [],
    history: [],
    elevated: false,
  }
}

// ---------------------------------------------------------------------------
// Path handling
// ---------------------------------------------------------------------------

/** Normalise an absolute path, resolving . and .. without touching disk. */
export function normalisePath(path: string): string {
  const parts = path.split('/').filter((p) => p.length > 0)
  const out: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      out.pop()
      continue
    }
    out.push(part)
  }
  return '/' + out.join('/')
}

/** Resolve a possibly-relative path against the working directory. */
export function resolvePath(cwd: string, target: string): string {
  if (target.startsWith('/')) return normalisePath(target)
  if (target === '~') return cwd
  return normalisePath(`${cwd}/${target}`)
}

/** Walk the tree to the node at an absolute path, or null. */
export function nodeAt(root: FsNode, path: string): FsNode | null {
  const parts = normalisePath(path)
    .split('/')
    .filter((p) => p.length > 0)
  let current: FsNode = root
  for (const part of parts) {
    if (current.type !== 'dir' || !current.children) return null
    const next = current.children.find((c) => c.name === part)
    if (!next) return null
    current = next
  }
  return current
}

/** Render a mode like "640" as "rw-r-----". */
export function modeToSymbolic(mode: string | undefined, isDir: boolean): string {
  const digits = (mode ?? (isDir ? '755' : '644')).slice(-3)
  const map = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  const body = digits
    .split('')
    .map((d) => map[Number(d)] ?? '---')
    .join('')
  return (isDir ? 'd' : '-') + body
}

/** True when "other" has the read bit, i.e. the file is world-readable. */
export function isWorldReadable(node: FsNode): boolean {
  const digits = (node.mode ?? (node.type === 'dir' ? '755' : '644')).slice(-3)
  const other = Number(digits[2] ?? '0')
  return (other & 4) === 4
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

const HELP = [
  'Available commands (all simulated):',
  '  pwd                 print working directory',
  '  ls [-l] [path]      list directory contents',
  '  cd <path>           change directory',
  '  cat <file>          print a file',
  '  whoami              print the current user',
  '  id                  print user identity',
  '  find <path> [-perm] list files beneath a path',
  '  grep <text> <file>  search inside a file',
  '  nmap <target>       scan a simulated host',
  '  sudo <command>      attempt to run as root',
  '  clear               clear the screen',
  '  help                this list',
]

function out(text: string): Line {
  return { kind: 'output', text }
}
function err(text: string): Line {
  return { kind: 'error', text }
}

/** Every file beneath a node, as absolute paths. */
function walk(node: FsNode, prefix: string): { path: string; node: FsNode }[] {
  const here = prefix === '' ? '/' : prefix
  const results: { path: string; node: FsNode }[] = [{ path: here, node }]
  if (node.type === 'dir' && node.children) {
    for (const child of node.children) {
      const childPath = here === '/' ? `/${child.name}` : `${here}/${child.name}`
      results.push(...walk(child, childPath))
    }
  }
  return results
}

function listing(node: FsNode, long: boolean): Line[] {
  if (node.type === 'file') {
    return [out(long ? `${modeToSymbolic(node.mode, false)}  ${node.owner ?? 'root'}  ${node.name}` : node.name)]
  }
  const children = node.children ?? []
  if (children.length === 0) return []
  if (!long) return [out(children.map((c) => c.name).join('  '))]
  return children.map((c) =>
    out(
      `${modeToSymbolic(c.mode, c.type === 'dir')}  ${(c.owner ?? 'root').padEnd(8)}  ${
        c.group ?? 'root'
      }  ${c.name}`,
    ),
  )
}

/**
 * Run one command line. Pure: returns a new state, never mutates the old one.
 */
export function runCommand(state: TerminalState, lab: TerminalLab, raw: string): TerminalState {
  const input = raw.trim()
  const prompt = `${state.user}@${state.hostname}:${state.cwd}$ ${input}`
  const lines: Line[] = [...state.lines, { kind: 'input', text: prompt }]

  if (input.length === 0) return { ...state, lines }

  const history = [...state.history, input]
  const [command, ...args] = input.split(/\s+/)
  const root = lab.host.filesystem

  const next = (extra: Line[], patch: Partial<TerminalState> = {}): TerminalState => {
    const merged: TerminalState = { ...state, lines: [...lines, ...extra], history, ...patch }
    return { ...merged, goalsMet: matchGoals(merged, lab, input) }
  }

  switch (command) {
    case 'help':
      return next(HELP.map(out))

    case 'clear':
      return { ...state, history, lines: [], goalsMet: matchGoals(state, lab, input) }

    case 'pwd':
      return next([out(state.cwd)])

    case 'whoami':
      return next([out(state.elevated ? 'root' : state.user)])

    case 'id':
      return next([
        out(
          state.elevated
            ? 'uid=0(root) gid=0(root) groups=0(root)'
            : `uid=1000(${state.user}) gid=1000(${state.user}) groups=1000(${state.user})`,
        ),
      ])

    case 'ls': {
      const long = args.includes('-l') || args.includes('-la') || args.includes('-al')
      const target = args.find((a) => !a.startsWith('-'))
      const path = target ? resolvePath(state.cwd, target) : state.cwd
      const node = nodeAt(root, path)
      if (!node) return next([err(`ls: cannot access '${target ?? path}': No such file or directory`)])
      return next(listing(node, long))
    }

    case 'cd': {
      const target = args[0] ?? '/'
      const path = resolvePath(state.cwd, target)
      const node = nodeAt(root, path)
      if (!node) return next([err(`cd: ${target}: No such file or directory`)])
      if (node.type !== 'dir') return next([err(`cd: ${target}: Not a directory`)])
      return next([], { cwd: path })
    }

    case 'cat': {
      if (args.length === 0) return next([err('cat: missing operand')])
      const path = resolvePath(state.cwd, args[0])
      const node = nodeAt(root, path)
      if (!node) return next([err(`cat: ${args[0]}: No such file or directory`)])
      if (node.type === 'dir') return next([err(`cat: ${args[0]}: Is a directory`)])
      if (!isWorldReadable(node) && !state.elevated && node.owner !== state.user) {
        return next([err(`cat: ${args[0]}: Permission denied`)])
      }
      return next((node.content ?? '').split('\n').map(out))
    }

    case 'find': {
      const base = args.find((a) => !a.startsWith('-')) ?? state.cwd
      const path = resolvePath(state.cwd, base)
      const node = nodeAt(root, path)
      if (!node) return next([err(`find: '${base}': No such file or directory`)])

      const permIndex = args.indexOf('-perm')
      const wantWorldReadable = permIndex >= 0
      const found = walk(node, path).filter(
        (e) => e.node.type === 'file' && (!wantWorldReadable || isWorldReadable(e.node)),
      )
      if (found.length === 0) return next([out('(nothing found)')])
      return next(found.map((e) => out(e.path)))
    }

    case 'grep': {
      if (args.length < 2) return next([err('grep: usage: grep <text> <file>')])
      const [needle, file] = args
      const node = nodeAt(root, resolvePath(state.cwd, file))
      if (!node || node.type !== 'file') {
        return next([err(`grep: ${file}: No such file or directory`)])
      }
      const matches = (node.content ?? '')
        .split('\n')
        .filter((l) => l.toLowerCase().includes(needle.toLowerCase()))
      return next(matches.length ? matches.map(out) : [out('(no matches)')])
    }

    case 'nmap': {
      const target = args.find((a) => !a.startsWith('-'))
      if (!target) return next([err('nmap: a target is required')])
      const host = lab.host.network.find((h) => h.ip === target || h.hostname === target)
      if (!host) {
        return next([
          out(`Starting simulated scan of ${target}`),
          out('Note: 0 hosts up. This target is not part of the simulation.'),
        ])
      }
      return next([
        out(`Starting simulated scan of ${host.ip}`),
        out(`Nmap scan report for ${host.hostname ?? host.ip} (${host.ip})`),
        out('PORT      STATE     SERVICE   VERSION'),
        ...host.ports.map((p) =>
          out(
            `${String(p.port + '/' + p.proto).padEnd(10)}${p.state.padEnd(10)}${p.service.padEnd(
              10,
            )}${p.version ?? ''}`,
          ),
        ),
        out(`Scan done: 1 simulated host scanned.`),
      ])
    }

    case 'sudo': {
      if (args.length === 0) return next([err('sudo: a command is required')])
      // In-sim only, and only where the lab says this account may escalate.
      const allowed = lab.host.user === state.user && state.goalsMet.length > 0
      if (!allowed) {
        return next([
          err(`${state.user} is not in the sudoers file. This incident will be reported.`),
          { kind: 'note', text: 'Find out what this account can already reach before reaching higher.' },
        ])
      }
      return next([out(`Running '${args.join(' ')}' as root (simulated).`)], { elevated: true })
    }

    default:
      return next([
        err(`${command}: command not found`),
        { kind: 'note', text: "Type 'help' to see what this simulated shell supports." },
      ])
  }
}

/** Goals are matched against the normalised command text. */
function matchGoals(state: TerminalState, lab: TerminalLab, input: string): string[] {
  const met = new Set(state.goalsMet)
  for (const goal of lab.goals) {
    if (met.has(goal.id)) continue
    try {
      if (new RegExp(goal.whenCommandMatches, 'i').test(input)) met.add(goal.id)
    } catch {
      // A malformed pattern in content must not break the lab; the content
      // validator is where that should be caught.
    }
  }
  return [...met]
}

/** Whether every goal has been satisfied. */
export function isComplete(state: TerminalState, lab: TerminalLab): boolean {
  return lab.goals.every((g) => state.goalsMet.includes(g.id))
}
