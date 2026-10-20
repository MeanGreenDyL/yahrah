import { describe, it, expect } from 'vitest'
import {
  domainScores,
  functionScores,
  examReadiness,
  weakAreas,
  coverage,
  recordAnswer,
} from '@/engine/mastery'
import { SECURITY_PLUS, OBJECTIVES, CSF } from '@/content'
import type { Mastery } from '@/engine/save'

/** Mastery record where every objective is answered `correct` out of `seen`. */
function allObjectives(seen: number, correct: number): Record<string, Mastery> {
  return Object.fromEntries(OBJECTIVES.map((o) => [o.id, { seen, correct }]))
}

describe('curriculum spine loads', () => {
  it('has five Security+ domains summing to 100%', () => {
    expect(SECURITY_PLUS.domains).toHaveLength(5)
    expect(SECURITY_PLUS.domains.reduce((a, d) => a + d.weight, 0)).toBe(100)
  })

  it('has 28 objectives', () => {
    expect(OBJECTIVES).toHaveLength(28)
  })

  it('has six CSF Functions and 22 categories', () => {
    expect(CSF.functions).toHaveLength(6)
    expect(CSF.functions.reduce((a, f) => a + f.categories.length, 0)).toBe(22)
  })
})

describe('domainScores', () => {
  it('is all zero for a fresh save', () => {
    const scores = domainScores({})
    expect(scores).toHaveLength(5)
    expect(scores.every((d) => d.mastery === 0)).toBe(true)
  })

  it('reaches full mastery only when every objective is well answered', () => {
    const scores = domainScores(allObjectives(10, 10))
    expect(scores.every((d) => d.mastery === 1)).toBe(true)
    expect(examReadiness(allObjectives(10, 10))).toBe(100)
  })

  it('does not call a domain mastered from one perfect objective', () => {
    const one = SECURITY_PLUS.domains[0].objectives[0].id
    const scores = domainScores({ [one]: { seen: 20, correct: 20 } })
    const domain = scores.find((d) => d.id === 'SP.1')!
    expect(domain.mastery).toBeGreaterThan(0)
    expect(domain.mastery).toBeLessThan(0.5)
  })

  it('carries the exam weight through', () => {
    const byId = new Map(domainScores({}).map((d) => [d.id, d]))
    expect(byId.get('SP.4')!.weight).toBe(28)
    expect(byId.get('SP.1')!.weight).toBe(12)
  })

  it('sums seen and correct across the domain', () => {
    const domain = SECURITY_PLUS.domains[0]
    const mastery = Object.fromEntries(
      domain.objectives.map((o) => [o.id, { seen: 3, correct: 2 }]),
    )
    const score = domainScores(mastery).find((d) => d.id === domain.id)!
    expect(score.seen).toBe(domain.objectives.length * 3)
    expect(score.correct).toBe(domain.objectives.length * 2)
  })
})

describe('functionScores', () => {
  it('reads CSF category ids out of the same mastery record', () => {
    const scores = functionScores({ 'PR.AA': { seen: 8, correct: 8 } })
    const protect = scores.find((f) => f.id === 'PR')!
    expect(protect.mastery).toBeGreaterThan(0)
    const category = protect.categories.find((c) => c.id === 'PR.AA')!
    expect(category.mastery).toBe(1)
  })

  it('does not confuse Security+ ids with CSF ids', () => {
    // SP ids live in the same record and must not leak into CSF scoring.
    const scores = functionScores({ 'SP.1.1': { seen: 50, correct: 50 } })
    expect(scores.every((f) => f.mastery === 0)).toBe(true)
  })

  it('covers all six Functions', () => {
    expect(functionScores({}).map((f) => f.id)).toEqual(['GV', 'ID', 'PR', 'DE', 'RS', 'RC'])
  })
})

describe('examReadiness', () => {
  it('is zero for a fresh save', () => {
    expect(examReadiness({})).toBe(0)
  })

  it('weights the heaviest domain most', () => {
    const heavy = SECURITY_PLUS.domains.find((d) => d.id === 'SP.4')! // 28%
    const light = SECURITY_PLUS.domains.find((d) => d.id === 'SP.1')! // 12%

    const masterHeavy = Object.fromEntries(
      heavy.objectives.map((o) => [o.id, { seen: 10, correct: 10 }]),
    )
    const masterLight = Object.fromEntries(
      light.objectives.map((o) => [o.id, { seen: 10, correct: 10 }]),
    )

    expect(examReadiness(masterHeavy)).toBeGreaterThan(examReadiness(masterLight))
  })

  it('tracks the domain weight proportionally', () => {
    const heavy = SECURITY_PLUS.domains.find((d) => d.id === 'SP.4')!
    const mastery = Object.fromEntries(
      heavy.objectives.map((o) => [o.id, { seen: 10, correct: 10 }]),
    )
    // Mastering exactly one 28%-weighted domain should read as about 28.
    expect(examReadiness(mastery)).toBe(28)
  })

  it('stays within 0..100', () => {
    expect(examReadiness(allObjectives(100, 100))).toBeLessThanOrEqual(100)
    expect(examReadiness(allObjectives(10, 0))).toBeGreaterThanOrEqual(0)
  })

  it('is lower for sloppy answers than for accurate ones', () => {
    expect(examReadiness(allObjectives(20, 10))).toBeLessThan(examReadiness(allObjectives(20, 20)))
  })
})

describe('weakAreas', () => {
  it('is empty before anything is attempted', () => {
    expect(weakAreas({})).toEqual([])
  })

  it('excludes objectives never attempted', () => {
    const one = OBJECTIVES[0].id
    const weak = weakAreas({ [one]: { seen: 5, correct: 1 } })
    expect(weak).toHaveLength(1)
    expect(weak[0].id).toBe(one)
  })

  it('ranks the weakest first', () => {
    const [a, b, c] = OBJECTIVES.map((o) => o.id)
    const weak = weakAreas({
      [a]: { seen: 10, correct: 9 },
      [b]: { seen: 10, correct: 1 },
      [c]: { seen: 10, correct: 5 },
    })
    expect(weak.map((w) => w.id)).toEqual([b, c, a])
  })

  it('respects the limit', () => {
    expect(weakAreas(allObjectives(5, 1), 3)).toHaveLength(3)
  })
})

describe('coverage', () => {
  it('reports nothing touched for a fresh save', () => {
    expect(coverage({})).toEqual({ touched: 0, total: 28, ratio: 0 })
  })

  it('counts only attempted objectives', () => {
    const result = coverage({
      [OBJECTIVES[0].id]: { seen: 1, correct: 0 },
      [OBJECTIVES[1].id]: { seen: 0, correct: 0 },
    })
    expect(result.touched).toBe(1)
  })

  it('reaches 1 when everything is touched', () => {
    expect(coverage(allObjectives(1, 0)).ratio).toBe(1)
  })
})

describe('recordAnswer', () => {
  it('increments every reference a question carries', () => {
    const next = recordAnswer({}, ['SP.1.1', 'PR.AA'], true)
    expect(next['SP.1.1']).toEqual({ seen: 1, correct: 1 })
    expect(next['PR.AA']).toEqual({ seen: 1, correct: 1 })
  })

  it('counts a wrong answer as seen but not correct', () => {
    const next = recordAnswer({}, ['SP.2.4'], false)
    expect(next['SP.2.4']).toEqual({ seen: 1, correct: 0 })
  })

  it('accumulates across answers', () => {
    let m = recordAnswer({}, ['SP.1.1'], true)
    m = recordAnswer(m, ['SP.1.1'], false)
    m = recordAnswer(m, ['SP.1.1'], true)
    expect(m['SP.1.1']).toEqual({ seen: 3, correct: 2 })
  })

  it('does not mutate the record it is given', () => {
    const original = { 'SP.1.1': { seen: 1, correct: 1 } }
    const next = recordAnswer(original, ['SP.1.1'], true)
    expect(original['SP.1.1']).toEqual({ seen: 1, correct: 1 })
    expect(next['SP.1.1']).toEqual({ seen: 2, correct: 2 })
  })
})
