import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  startLogs,
  toggleFlag,
  setFilter,
  setSort,
  visibleRows,
  scoreLogs,
} from '@/labs/logs'
import {
  startPhishing,
  currentEmail,
  judge,
  nextEmail,
  toggleHeaders,
  isFinished,
  scorePhishing,
} from '@/labs/phishing'
import { labSchema, type LogsLab, type PhishingLab } from '@/content/schemas'

function loadLab<T>(file: string): T {
  const raw = JSON.parse(
    readFileSync(join(import.meta.dirname, '..', '..', 'content', 'labs', file), 'utf8'),
  )
  return labSchema.parse(raw[0]) as T
}

const LOGS = loadLab<LogsLab>('hakumura-logs.json')
const PHISH = loadLab<PhishingLab>('hakumura-phishing.json')

describe('log triage', () => {
  it('starts with nothing flagged', () => {
    const state = startLogs(LOGS)
    expect(state.flagged).toEqual([])
    expect(scoreLogs(LOGS, state).hits).toBe(0)
  })

  it('shows every row unfiltered', () => {
    expect(visibleRows(LOGS, startLogs(LOGS))).toHaveLength(LOGS.rows.length)
  })

  it('filters case-insensitively across all columns', () => {
    const state = setFilter(startLogs(LOGS), '198.51.100.77')
    const rows = visibleRows(LOGS, state)
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.every((r) => Object.values(r.cells).some((v) => v.includes('198.51.100.77')))).toBe(
      true,
    )
  })

  it('an unmatched filter yields nothing rather than everything', () => {
    expect(visibleRows(LOGS, setFilter(startLogs(LOGS), 'zzzz-no-match'))).toHaveLength(0)
  })

  it('defaults to ascending on the first column', () => {
    const state = startLogs(LOGS)
    expect(state.sortBy).toBe('time')
    expect(state.sortAsc).toBe(true)
    const times = visibleRows(LOGS, state).map((r) => r.cells.time)
    expect(times).toEqual([...times].sort())
  })

  it('re-selecting the current column reverses the order', () => {
    const ascState = startLogs(LOGS)
    const asc = visibleRows(LOGS, ascState).map((r) => r.cells.time)

    const descState = setSort(ascState, 'time')
    expect(descState.sortAsc).toBe(false)
    const desc = visibleRows(LOGS, descState).map((r) => r.cells.time)

    expect(desc).toEqual([...asc].reverse())
  })

  it('selecting a different column sorts it ascending', () => {
    const state = setSort(startLogs(LOGS), 'user')
    expect(state.sortBy).toBe('user')
    expect(state.sortAsc).toBe(true)
    const users = visibleRows(LOGS, state).map((r) => r.cells.user)
    expect(users).toEqual([...users].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })))
  })

  it('sorting does not mutate the lab content', () => {
    const before = LOGS.rows.map((r) => r.id)
    visibleRows(LOGS, setSort(startLogs(LOGS), 'user'))
    expect(LOGS.rows.map((r) => r.id)).toEqual(before)
  })

  it('toggles a flag on and off', () => {
    let state = startLogs(LOGS)
    state = toggleFlag(state, 'l05')
    expect(state.flagged).toEqual(['l05'])
    state = toggleFlag(state, 'l05')
    expect(state.flagged).toEqual([])
  })

  it('scores a perfect answer', () => {
    let state = startLogs(LOGS)
    for (const row of LOGS.rows.filter((r) => r.malicious)) state = toggleFlag(state, row.id)
    const score = scoreLogs(LOGS, state)
    expect(score.perfect).toBe(true)
    expect(score.misses).toBe(0)
    expect(score.falsePositives).toBe(0)
  })

  it('counts a false positive and is not perfect', () => {
    let state = startLogs(LOGS)
    for (const row of LOGS.rows.filter((r) => r.malicious)) state = toggleFlag(state, row.id)
    state = toggleFlag(state, 'l15') // Oribe's typo - benign
    const score = scoreLogs(LOGS, state)
    expect(score.falsePositives).toBe(1)
    expect(score.perfect).toBe(false)
  })

  it('counts misses when only the failures are flagged', () => {
    let state = startLogs(LOGS)
    for (const row of LOGS.rows.filter((r) => r.malicious && r.cells.result === 'failure')) {
      state = toggleFlag(state, row.id)
    }
    const score = scoreLogs(LOGS, state)
    expect(score.misses).toBeGreaterThan(0)
    expect(score.perfect).toBe(false)
  })

  it('the content encodes a real spray: one source, many users, one each', () => {
    const malicious = LOGS.rows.filter((r) => r.malicious)
    const sources = new Set(malicious.map((r) => r.cells.source))
    expect(sources.size).toBe(1)
    const failures = malicious.filter((r) => r.cells.result === 'failure')
    expect(new Set(failures.map((r) => r.cells.user)).size).toBe(failures.length)
  })

  it('includes a benign near-miss so the exercise tests false positives', () => {
    const benignFailure = LOGS.rows.find((r) => !r.malicious && r.cells.result === 'failure')
    expect(benignFailure).toBeDefined()
  })
})

describe('phishing triage', () => {
  it('starts on the first email with nothing judged', () => {
    const state = startPhishing()
    expect(currentEmail(PHISH, state)?.id).toBe(PHISH.emails[0].id)
    expect(isFinished(PHISH, state)).toBe(false)
  })

  it('records a verdict and reveals the tells', () => {
    const state = judge(PHISH, startPhishing(), 'phish')
    expect(state.revealed).toBe(true)
    expect(Object.keys(state.verdicts)).toHaveLength(1)
  })

  it('does not let a verdict be changed once given', () => {
    let state = judge(PHISH, startPhishing(), 'phish')
    const first = state.verdicts[PHISH.emails[0].id]
    state = judge(PHISH, state, 'legitimate')
    expect(state.verdicts[PHISH.emails[0].id]).toBe(first)
  })

  it('advances through every email and then stops', () => {
    let state = startPhishing()
    for (let i = 0; i < PHISH.emails.length; i++) {
      state = judge(PHISH, state, 'phish')
      state = nextEmail(PHISH, state)
    }
    expect(isFinished(PHISH, state)).toBe(true)
    expect(state.index).toBe(PHISH.emails.length - 1)
  })

  it('toggles the header view', () => {
    const state = toggleHeaders(startPhishing())
    expect(state.headersOpen).toBe(true)
    expect(toggleHeaders(state).headersOpen).toBe(false)
  })

  it('scores a perfect run', () => {
    let state = startPhishing()
    for (const email of PHISH.emails) {
      state = judge(PHISH, state, email.verdict)
      state = nextEmail(PHISH, state)
    }
    const score = scorePhishing(PHISH, state)
    expect(score.correct).toBe(PHISH.emails.length)
    expect(score.missed).toBe(0)
    expect(score.falseAlarms).toBe(0)
  })

  it('distinguishes a false alarm from a missed phish', () => {
    let state = startPhishing()
    // Call everything a phish: legitimate mail becomes a false alarm.
    for (const _ of PHISH.emails) {
      state = judge(PHISH, state, 'phish')
      state = nextEmail(PHISH, state)
    }
    const score = scorePhishing(PHISH, state)
    expect(score.falseAlarms).toBe(PHISH.emails.filter((e) => e.verdict === 'legitimate').length)
    expect(score.missed).toBe(0)

    let lax = startPhishing()
    for (const _ of PHISH.emails) {
      lax = judge(PHISH, lax, 'legitimate')
      lax = nextEmail(PHISH, lax)
    }
    const laxScore = scorePhishing(PHISH, lax)
    expect(laxScore.missed).toBe(PHISH.emails.filter((e) => e.verdict === 'phish').length)
    expect(laxScore.falseAlarms).toBe(0)
  })

  it('the content is not "every suspicious signal is hostile"', () => {
    // A legitimate message with an attachment, and one from an external domain.
    const legit = PHISH.emails.filter((e) => e.verdict === 'legitimate')
    expect(legit.length).toBeGreaterThan(1)
    expect(legit.some((e) => e.attachments.length > 0)).toBe(true)
    expect(legit.some((e) => !e.from.includes('gatehouse.yahrah.local'))).toBe(true)
  })

  it('every email explains what should have been spotted', () => {
    for (const email of PHISH.emails) {
      expect(email.tells.length).toBeGreaterThan(0)
    }
  })

  it('uses only reserved example domains', () => {
    for (const email of PHISH.emails) {
      const text = `${email.from} ${email.replyTo ?? ''} ${JSON.stringify(email.headers)} ${JSON.stringify(email.links)}`
      const domains = text.match(/@[\w.-]+|https?:\/\/[\w.-]+/g) ?? []
      for (const d of domains) {
        expect(d).toMatch(/\.example|\.local|192\.168\.|203\.0\.113\.|198\.51\.100\./)
      }
    }
  })
})
