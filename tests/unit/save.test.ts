import { describe, it, expect } from 'vitest'
import {
  newSave,
  migrate,
  exportSave,
  importSave,
  touchStreak,
  daysBetween,
  today,
  SaveMigrationError,
  SAVE_VERSION,
} from '@/engine/save'

describe('newSave', () => {
  it('starts with audio off, as the brief requires', () => {
    expect(newSave().settings.audio).toBe(false)
  })

  it('starts unvowed, at level 1, with no clan', () => {
    const s = newSave()
    expect(s.profile.vowsAccepted).toBe(false)
    expect(s.profile.level).toBe(1)
    expect(s.profile.clanId).toBeNull()
  })

  it('validates against its own schema', () => {
    expect(() => migrate(newSave())).not.toThrow()
  })
})

describe('export / import round-trip', () => {
  it('preserves a save exactly', () => {
    const original = newSave()
    original.profile.name = 'Kagemi'
    original.profile.xp = 1234
    original.profile.level = 7
    original.progress.lessonsCompleted = ['haku-01', 'haku-02']
    original.mastery['SP.1.1'] = { seen: 10, correct: 8 }
    original.srs['q-control-types'] = {
      interval: 6,
      ease: 2.5,
      streak: 3,
      due: '2026-11-01',
      lapses: 1,
    }

    const restored = importSave(exportSave(original))
    expect(restored).toEqual(original)
  })

  it('survives a trip through a file-like string with unicode', () => {
    const original = newSave()
    original.profile.name = 'Oribe — 織部'
    expect(importSave(exportSave(original)).profile.name).toBe('Oribe — 織部')
  })

  it('rejects malformed JSON with a readable message', () => {
    expect(() => importSave('{not json')).toThrow(SaveMigrationError)
    expect(() => importSave('{not json')).toThrow(/not valid JSON/)
  })

  it('rejects a structurally wrong save', () => {
    expect(() => importSave(JSON.stringify({ version: 1, profile: {} }))).toThrow(
      SaveMigrationError,
    )
  })
})

describe('migrate', () => {
  it('refuses a save from a newer build rather than downgrading it', () => {
    const future = { ...newSave(), version: SAVE_VERSION + 1 }
    expect(() => migrate(future)).toThrow(/newer than this build/)
  })

  it('refuses a save with no version', () => {
    const { version: _version, ...rest } = newSave()
    expect(() => migrate(rest)).toThrow(/no usable version/)
  })

  it('refuses non-objects', () => {
    expect(() => migrate(null)).toThrow(SaveMigrationError)
    expect(() => migrate('nope')).toThrow(SaveMigrationError)
    expect(() => migrate(42)).toThrow(SaveMigrationError)
  })

  it('rejects out-of-range settings rather than clamping silently', () => {
    const bad = newSave()
    bad.settings.textScale = 99
    expect(() => migrate(bad)).toThrow(SaveMigrationError)
  })
})

describe('daysBetween', () => {
  it('counts consecutive days as 1', () => {
    expect(daysBetween('2026-10-19', '2026-10-20')).toBe(1)
  })

  it('handles month boundaries', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1)
  })

  it('handles year boundaries', () => {
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('handles leap days', () => {
    expect(daysBetween('2028-02-28', '2028-02-29')).toBe(1)
    expect(daysBetween('2028-02-29', '2028-03-01')).toBe(1)
  })

  it('is negative going backwards', () => {
    expect(daysBetween('2026-10-20', '2026-10-19')).toBe(-1)
  })

  it('is zero for the same day', () => {
    expect(daysBetween('2026-10-20', '2026-10-20')).toBe(0)
  })
})

describe('touchStreak', () => {
  it('starts a streak at 1 on the first day played', () => {
    const s = touchStreak(newSave(), '2026-10-20')
    expect(s.streak.current).toBe(1)
    expect(s.streak.longest).toBe(1)
    expect(s.streak.lastPlayedDay).toBe('2026-10-20')
  })

  it('is a no-op on the same day', () => {
    const first = touchStreak(newSave(), '2026-10-20')
    const again = touchStreak(first, '2026-10-20')
    expect(again).toBe(first)
    expect(again.streak.current).toBe(1)
  })

  it('extends on the next calendar day', () => {
    let s = touchStreak(newSave(), '2026-10-19')
    s = touchStreak(s, '2026-10-20')
    expect(s.streak.current).toBe(2)
  })

  it('resets after a missed day', () => {
    let s = touchStreak(newSave(), '2026-10-17')
    s = touchStreak(s, '2026-10-18')
    expect(s.streak.current).toBe(2)
    s = touchStreak(s, '2026-10-20') // skipped the 19th
    expect(s.streak.current).toBe(1)
  })

  it('remembers the longest streak after a reset', () => {
    let s = newSave()
    for (const d of ['2026-10-01', '2026-10-02', '2026-10-03']) s = touchStreak(s, d)
    expect(s.streak.current).toBe(3)
    s = touchStreak(s, '2026-10-20')
    expect(s.streak.current).toBe(1)
    expect(s.streak.longest).toBe(3)
  })

  it('extends a streak across a month boundary', () => {
    let s = touchStreak(newSave(), '2026-10-31')
    s = touchStreak(s, '2026-11-01')
    expect(s.streak.current).toBe(2)
  })
})

describe('today', () => {
  it('formats as YYYY-MM-DD with zero padding', () => {
    expect(today(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(today(new Date(2026, 11, 31))).toBe('2026-12-31')
  })
})
