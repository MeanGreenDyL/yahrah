import { describe, it, expect } from 'vitest'
import { shuffleSeeded, mulberry32, hashSeed } from '@/engine/shuffle'
import { QUESTIONS } from '@/content'

describe('shuffleSeeded', () => {
  const items = ['a', 'b', 'c', 'd', 'e']

  it('is deterministic for the same seed', () => {
    expect(shuffleSeeded(items, 'q1')).toEqual(shuffleSeeded(items, 'q1'))
  })

  it('differs across seeds', () => {
    const seeds = ['q1', 'q2', 'q3', 'q4', 'q5']
    const results = seeds.map((s) => shuffleSeeded(items, s).join(''))
    expect(new Set(results).size).toBeGreaterThan(1)
  })

  it('preserves every element exactly once', () => {
    expect(shuffleSeeded(items, 'seed').sort()).toEqual([...items].sort())
  })

  it('does not mutate the input', () => {
    const original = [...items]
    shuffleSeeded(items, 'seed')
    expect(items).toEqual(original)
  })

  it('handles empty and single-element arrays', () => {
    expect(shuffleSeeded([], 'x')).toEqual([])
    expect(shuffleSeeded(['only'], 'x')).toEqual(['only'])
  })
})

describe('mulberry32', () => {
  it('produces values in [0, 1)', () => {
    const random = mulberry32(12345)
    for (let i = 0; i < 1000; i++) {
      const v = random()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('is reproducible', () => {
    const a = mulberry32(99)
    const b = mulberry32(99)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
})

describe('hashSeed', () => {
  it('is stable and non-negative', () => {
    expect(hashSeed('abc')).toBe(hashSeed('abc'))
    expect(hashSeed('abc')).toBeGreaterThanOrEqual(0)
  })

  it('separates similar strings', () => {
    expect(hashSeed('q-control-1')).not.toBe(hashSeed('q-control-2'))
  })
})

describe('the correct answer is not always in the same slot', () => {
  it('does not place every correct answer first', () => {
    const singles = QUESTIONS.filter((q) => q.type === 'single')
    expect(singles.length).toBeGreaterThan(3)

    const positions = singles.map((q) => {
      const shuffled = shuffleSeeded(q.choices, q.id)
      return shuffled.findIndex((c) => c.id === q.answer)
    })

    // Authored content lists the answer first; after shuffling it must not.
    expect(new Set(positions).size).toBeGreaterThan(1)
    expect(positions.every((p) => p === 0)).toBe(false)
  })
})
