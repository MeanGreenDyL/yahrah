import { masteryRatio } from './progression'
import { SECURITY_PLUS, CSF, OBJECTIVES } from '@/content'
import type { Mastery } from './save'

/**
 * Turns a save's raw per-topic tallies into the numbers the dashboard shows.
 *
 * `save.mastery` is keyed by curriculum reference. Security+ objective ids
 * ("SP.1.2") and CSF category ids ("PR.AA") never collide, so both live in
 * one record and each is read back by its own id shape.
 */

export type Scored = {
  id: string
  name: string
  /** 0..1 */
  mastery: number
  seen: number
  correct: number
}

export type DomainScore = Scored & { weight: number; objectives: Scored[] }
export type FunctionScore = Scored & { categories: Scored[] }

const EMPTY: Mastery = { seen: 0, correct: 0 }

function score(id: string, name: string, tally: Mastery): Scored {
  return {
    id,
    name,
    mastery: masteryRatio(tally.seen, tally.correct),
    seen: tally.seen,
    correct: tally.correct,
  }
}

/** Mastery per Security+ domain, with each objective underneath. */
export function domainScores(mastery: Record<string, Mastery>): DomainScore[] {
  return SECURITY_PLUS.domains.map((domain) => {
    const objectives = domain.objectives.map((o) =>
      score(o.id, o.statement, mastery[o.id] ?? EMPTY),
    )
    const seen = objectives.reduce((a, o) => a + o.seen, 0)
    const correct = objectives.reduce((a, o) => a + o.correct, 0)
    // An untouched objective counts as zero, so the bar reflects coverage
    // as well as accuracy - otherwise one perfect objective would read as
    // a mastered domain.
    const avg = objectives.reduce((a, o) => a + o.mastery, 0) / Math.max(1, objectives.length)

    return {
      id: domain.id,
      name: domain.name,
      weight: domain.weight,
      mastery: avg,
      seen,
      correct,
      objectives,
    }
  })
}

/** Mastery per CSF 2.0 Function, with each category underneath. */
export function functionScores(mastery: Record<string, Mastery>): FunctionScore[] {
  return CSF.functions.map((fn) => {
    const categories = fn.categories.map((c) => score(c.id, c.name, mastery[c.id] ?? EMPTY))
    const seen = categories.reduce((a, c) => a + c.seen, 0)
    const correct = categories.reduce((a, c) => a + c.correct, 0)
    const avg = categories.reduce((a, c) => a + c.mastery, 0) / Math.max(1, categories.length)

    return { id: fn.id, name: fn.name, mastery: avg, seen, correct, categories }
  })
}

/**
 * Exam readiness, 0..100: domain mastery weighted by the domain's share of
 * the exam. A domain worth 28% moves this four times as much as one worth 7%.
 *
 * This is a study aid, not a prediction. It says how much of the syllabus you
 * have demonstrated, weighted the way the exam weights it.
 */
export function examReadiness(mastery: Record<string, Mastery>): number {
  const domains = domainScores(mastery)
  const totalWeight = domains.reduce((a, d) => a + d.weight, 0)
  if (totalWeight === 0) return 0
  const weighted = domains.reduce((a, d) => a + d.mastery * d.weight, 0)
  return Math.round((weighted / totalWeight) * 100)
}

/**
 * The objectives most worth studying next: attempted at least once, ranked
 * by weakness, then by how heavily the exam weights their domain.
 *
 * Objectives never attempted are excluded - "you haven't started this" is
 * not the same signal as "you keep getting this wrong", and the dashboard
 * reports untouched coverage separately.
 */
export function weakAreas(mastery: Record<string, Mastery>, limit = 5): Scored[] {
  return OBJECTIVES.filter((o) => (mastery[o.id]?.seen ?? 0) > 0)
    .map((o) => ({
      ...score(o.id, o.statement, mastery[o.id] ?? EMPTY),
      weight: o.domainWeight,
    }))
    .sort((a, b) => a.mastery - b.mastery || b.weight - a.weight)
    .slice(0, limit)
}

/** How much of the syllabus has been touched at all. */
export function coverage(mastery: Record<string, Mastery>): {
  touched: number
  total: number
  ratio: number
} {
  const total = OBJECTIVES.length
  const touched = OBJECTIVES.filter((o) => (mastery[o.id]?.seen ?? 0) > 0).length
  return { touched, total, ratio: total === 0 ? 0 : touched / total }
}

/** Record an answer against every curriculum reference a question carries. */
export function recordAnswer(
  mastery: Record<string, Mastery>,
  refs: string[],
  correct: boolean,
): Record<string, Mastery> {
  const next = { ...mastery }
  for (const ref of refs) {
    const prior = next[ref] ?? EMPTY
    next[ref] = { seen: prior.seen + 1, correct: prior.correct + (correct ? 1 : 0) }
  }
  return next
}
