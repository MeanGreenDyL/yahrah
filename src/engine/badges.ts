import type { Save } from './save'
import { coverage, examReadiness } from './mastery'

/**
 * Badges. Each one is a pure predicate over the save, so awarding is
 * idempotent and recomputable: there is no way for the badge list to drift
 * out of step with what the player has actually done.
 */

export type Badge = {
  id: string
  name: string
  description: string
  /** Shown before it is earned, so the player knows what to aim at. */
  hint: string
  earned: (save: Save) => boolean
}

export const BADGES: Badge[] = [
  {
    id: 'first-light',
    name: 'First Light',
    description: 'You took the Three Vows.',
    hint: 'Take the Three Vows.',
    earned: (s) => s.profile.vowsAccepted,
  },
  {
    id: 'thread-pulled',
    name: 'Thread Pulled',
    description: 'You answered your first question.',
    hint: 'Answer a question.',
    earned: (s) => Object.values(s.mastery).some((m) => m.seen > 0),
  },
  {
    id: 'steady-hand',
    name: 'Steady Hand',
    description: 'Three days in a row.',
    hint: 'Play three days running.',
    earned: (s) => s.streak.longest >= 3,
  },
  {
    id: 'weeklong-watch',
    name: 'Weeklong Watch',
    description: 'Seven days in a row.',
    hint: 'Play seven days running.',
    earned: (s) => s.streak.longest >= 7,
  },
  {
    id: 'oribe',
    name: 'Rank: Oribe',
    description: 'You reached level 6 and the rank of Weaver.',
    hint: 'Reach level 6.',
    earned: (s) => s.profile.level >= 6,
  },
  {
    id: 'cartographer',
    name: 'Cartographer',
    description: 'You touched a quarter of the Security+ syllabus.',
    hint: 'Study a quarter of the objectives.',
    earned: (s) => coverage(s.mastery).ratio >= 0.25,
  },
  {
    id: 'half-ready',
    name: 'Half Ready',
    description: 'Your exam readiness passed 50.',
    hint: 'Reach an exam readiness of 50.',
    earned: (s) => examReadiness(s.mastery) >= 50,
  },
  {
    id: 'lab-hand',
    name: 'Lab Hand',
    description: 'You completed your first lab.',
    hint: 'Finish a hands-on lab.',
    earned: (s) => s.progress.labsCompleted.length > 0,
  },
]

export const BADGE_BY_ID = new Map(BADGES.map((b) => [b.id, b]))

/** Every badge currently earned, recomputed from the save. */
export function earnedBadges(save: Save): Badge[] {
  return BADGES.filter((badge) => badge.earned(save))
}

/**
 * Recompute the stored badge list, returning the save plus any newly earned
 * badges so the UI can celebrate them.
 */
export function syncBadges(save: Save): { save: Save; newly: Badge[] } {
  const earned = earnedBadges(save)
  const earnedIds = earned.map((b) => b.id)
  const known = new Set(save.progress.badges)
  const newly = earned.filter((b) => !known.has(b.id))

  if (newly.length === 0 && earnedIds.length === save.progress.badges.length) {
    return { save, newly: [] }
  }

  return {
    save: { ...save, progress: { ...save.progress, badges: earnedIds } },
    newly,
  }
}
