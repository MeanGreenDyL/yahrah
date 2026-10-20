import { daysBetween, type SrsCard } from './save'

/**
 * Spaced repetition, an SM-2 variant.
 *
 * Four grades rather than SM-2's 0-5 scale, because a quiz battle gives a
 * coarser signal than a self-rated flashcard: you either knew it, knew it
 * slowly, or did not.
 *
 * A lapsed card becomes due the same day, which is what makes missed
 * concepts come back as wild encounters inside the session that missed them.
 */

export type Grade = 'again' | 'hard' | 'good' | 'easy'

/** SM-2 quality values for each grade. */
const QUALITY: Record<Grade, number> = { again: 0, hard: 3, good: 4, easy: 5 }

export const MIN_EASE = 1.3
export const MAX_EASE = 2.8
export const DEFAULT_EASE = 2.5

/** Interval in days after the first and second successful reviews. */
const FIRST_INTERVAL = 1
const SECOND_INTERVAL = 6

/**
 * Longest interval we will ever schedule. Without a cap, a run of "easy"
 * grades compounds until the date arithmetic overflows and throws - and a
 * save file carrying such an interval would crash the app on load. Five
 * years is far beyond any exam horizon, so the cap costs nothing.
 */
export const MAX_INTERVAL_DAYS = 365 * 5

export function newCard(today: string): SrsCard {
  return { interval: 0, ease: DEFAULT_EASE, streak: 0, due: today, lapses: 0 }
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const step = Math.min(MAX_INTERVAL_DAYS, Math.max(0, Math.round(days)))
  const date = new Date(Date.UTC(y, m - 1, d + step))
  if (Number.isNaN(date.getTime())) return day
  return date.toISOString().slice(0, 10)
}

function clampInterval(days: number): number {
  if (!Number.isFinite(days)) return MAX_INTERVAL_DAYS
  return Math.min(MAX_INTERVAL_DAYS, Math.max(1, Math.round(days)))
}

function clampEase(ease: number): number {
  return Math.min(MAX_EASE, Math.max(MIN_EASE, ease))
}

/**
 * Grade a review and return the card's next state.
 *
 * Pure: takes the card and the day, returns a new card. Nothing here reads
 * the clock, so every interval is testable.
 */
export function review(card: SrsCard | undefined, grade: Grade, today: string): SrsCard {
  const current = card ?? newCard(today)
  const q = QUALITY[grade]

  // The standard SM-2 ease adjustment.
  const ease = clampEase(current.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  if (q < 3) {
    // A lapse. Back to the start of the ladder, and due again today so the
    // concept returns before the session ends.
    return {
      interval: 0,
      ease,
      streak: 0,
      due: today,
      lapses: current.lapses + 1,
    }
  }

  let interval: number
  if (current.streak === 0) {
    interval = FIRST_INTERVAL
  } else if (current.streak === 1) {
    interval = SECOND_INTERVAL
  } else {
    interval = clampInterval(current.interval * ease)
  }

  // "Hard" earns a shorter step than the ease alone would give.
  if (grade === 'hard') interval = clampInterval(interval * 0.6)
  interval = clampInterval(interval)

  return {
    interval,
    ease,
    streak: current.streak + 1,
    due: addDays(today, interval),
    lapses: current.lapses,
  }
}

/** Whether a card is due on (or before) a given day. */
export function isDue(card: SrsCard, today: string): boolean {
  return daysBetween(card.due, today) >= 0
}

/**
 * The ids due for review, most overdue first. Ties break towards cards that
 * have lapsed more often, since those are the shakiest.
 */
export function dueCards(srs: Record<string, SrsCard>, today: string, limit?: number): string[] {
  const due = Object.entries(srs)
    .filter(([, card]) => isDue(card, today))
    .sort(([, a], [, b]) => {
      const overdue = daysBetween(b.due, today) - daysBetween(a.due, today)
      return overdue !== 0 ? overdue : b.lapses - a.lapses
    })
    .map(([id]) => id)

  return limit === undefined ? due : due.slice(0, limit)
}

/** How many cards come due on a given day, for the dashboard. */
export function dueCount(srs: Record<string, SrsCard>, today: string): number {
  return dueCards(srs, today).length
}

/**
 * Build a session queue: cards that are due, then unseen questions to make
 * up the length. Returns ids in the order they should be presented.
 */
export function buildSession(
  srs: Record<string, SrsCard>,
  allQuestionIds: string[],
  today: string,
  size: number,
): string[] {
  const due = dueCards(srs, today, size)
  if (due.length >= size) return due.slice(0, size)

  const chosen = new Set(due)
  const fresh = allQuestionIds.filter((id) => !(id in srs) && !chosen.has(id))
  return [...due, ...fresh.slice(0, size - due.length)]
}
