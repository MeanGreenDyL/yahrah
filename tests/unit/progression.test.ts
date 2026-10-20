import { describe, it, expect } from 'vitest'
import {
  xpForNextLevel,
  totalXpForLevel,
  levelFromXp,
  xpIntoLevel,
  awardXp,
  masteryRatio,
} from '@/engine/progression'

describe('xp curve', () => {
  it('level 1 requires no cumulative xp', () => {
    expect(totalXpForLevel(1)).toBe(0)
  })

  it('each level costs more than the last', () => {
    for (let l = 1; l < 60; l++) {
      expect(xpForNextLevel(l + 1)).toBeGreaterThan(xpForNextLevel(l))
    }
  })

  it('cumulative totals match the per-level costs', () => {
    let running = 0
    for (let l = 1; l < 80; l++) {
      expect(totalXpForLevel(l)).toBe(running)
      running += xpForNextLevel(l)
    }
  })

  it('levelFromXp inverts totalXpForLevel exactly at boundaries', () => {
    for (let l = 1; l < 120; l++) {
      const at = totalXpForLevel(l)
      expect(levelFromXp(at)).toBe(l)
      if (l > 1) expect(levelFromXp(at - 1)).toBe(l - 1)
    }
  })

  it('is monotonic in xp', () => {
    let last = 1
    for (let xp = 0; xp < 40_000; xp += 37) {
      const level = levelFromXp(xp)
      expect(level).toBeGreaterThanOrEqual(last)
      last = level
    }
  })

  it('clamps nonsense input to level 1', () => {
    expect(levelFromXp(0)).toBe(1)
    expect(levelFromXp(-500)).toBe(1)
  })

  it('xpIntoLevel is always within the current level band', () => {
    for (let xp = 0; xp < 20_000; xp += 53) {
      const into = xpIntoLevel(xp)
      expect(into).toBeGreaterThanOrEqual(0)
      expect(into).toBeLessThan(xpForNextLevel(levelFromXp(xp)))
    }
  })

  it('reaches level 2 within a first session', () => {
    // 120 xp - a handful of correct answers and one short lab.
    expect(levelFromXp(120)).toBe(2)
  })
})

describe('awardXp', () => {
  it('reports a level up when it crosses a boundary', () => {
    const result = awardXp(totalXpForLevel(3) - 1, 1)
    expect(result.level).toBe(3)
    expect(result.leveledUp).toBe(true)
    expect(result.levelsGained).toBe(1)
  })

  it('reports no level up inside a band', () => {
    const result = awardXp(totalXpForLevel(3), 1)
    expect(result.leveledUp).toBe(false)
    expect(result.levelsGained).toBe(0)
  })

  it('can gain several levels from one large award', () => {
    const result = awardXp(0, totalXpForLevel(5))
    expect(result.level).toBe(5)
    expect(result.levelsGained).toBe(4)
  })

  it('never loses xp to a negative award', () => {
    expect(awardXp(500, -100).xp).toBe(500)
  })

  it('accumulates correctly over many small awards', () => {
    let xp = 0
    for (let i = 0; i < 100; i++) xp = awardXp(xp, 25).xp
    expect(xp).toBe(2500)
    expect(levelFromXp(2500)).toBe(levelFromXp(xp))
  })
})

describe('masteryRatio', () => {
  it('is zero with nothing seen', () => {
    expect(masteryRatio(0, 0)).toBe(0)
  })

  it('discounts a tiny sample', () => {
    // 3/3 correct is promising but not mastery.
    expect(masteryRatio(3, 3)).toBeLessThan(0.5)
  })

  it('reaches full credit for a perfect, well-sampled record', () => {
    expect(masteryRatio(8, 8)).toBe(1)
    expect(masteryRatio(40, 40)).toBe(1)
  })

  it('tracks accuracy once the sample is large enough', () => {
    expect(masteryRatio(20, 10)).toBeCloseTo(0.5, 5)
  })

  it('stays within 0..1 for odd input', () => {
    expect(masteryRatio(5, 50)).toBeLessThanOrEqual(1)
    expect(masteryRatio(5, -3)).toBeGreaterThanOrEqual(0)
  })
})
