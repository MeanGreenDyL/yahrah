import { describe, it, expect } from 'vitest'
import {
  review,
  newCard,
  isDue,
  dueCards,
  dueCount,
  buildSession,
  MIN_EASE,
  MAX_EASE,
  DEFAULT_EASE,
  MAX_INTERVAL_DAYS,
} from '@/engine/srs'
import { daysBetween, type SrsCard } from '@/engine/save'

const DAY = '2026-10-20'

/** Walk a card forward through a run of grades, advancing the clock each time. */
function drill(grades: ('again' | 'hard' | 'good' | 'easy')[], from = DAY) {
  let card: SrsCard | undefined
  let day = from
  for (const grade of grades) {
    card = review(card, grade, day)
    day = card.due
  }
  return { card: card!, day }
}

describe('newCard', () => {
  it('starts due immediately with the default ease', () => {
    const card = newCard(DAY)
    expect(card.due).toBe(DAY)
    expect(card.ease).toBe(DEFAULT_EASE)
    expect(card.streak).toBe(0)
    expect(card.lapses).toBe(0)
  })
})

describe('graduation ladder', () => {
  it('first correct answer schedules one day out', () => {
    const card = review(undefined, 'good', DAY)
    expect(card.interval).toBe(1)
    expect(card.due).toBe('2026-10-21')
    expect(card.streak).toBe(1)
  })

  it('second correct answer schedules six days out', () => {
    const { card } = drill(['good', 'good'])
    expect(card.interval).toBe(6)
    expect(card.streak).toBe(2)
  })

  it('third and later answers multiply by the ease factor', () => {
    const { card } = drill(['good', 'good', 'good'])
    // 6 days * ease (~2.5) = ~15
    expect(card.interval).toBeGreaterThan(10)
    expect(card.interval).toBeLessThan(20)
    expect(card.streak).toBe(3)
  })

  it('intervals grow monotonically on a correct run', () => {
    let card: SrsCard | undefined
    let day = DAY
    let previous = 0
    for (let i = 0; i < 8; i++) {
      card = review(card, 'good', day)
      day = card.due
      expect(card.interval).toBeGreaterThanOrEqual(previous)
      previous = card.interval
    }
  })

  it('"easy" pushes further out than "good"', () => {
    const good = drill(['good', 'good', 'good']).card
    const easy = drill(['good', 'good', 'easy']).card
    expect(easy.interval).toBeGreaterThan(good.interval)
  })

  it('"hard" pulls closer in than "good" and lowers ease', () => {
    const good = drill(['good', 'good', 'good']).card
    const hard = drill(['good', 'good', 'hard']).card
    expect(hard.interval).toBeLessThan(good.interval)
    expect(hard.ease).toBeLessThan(good.ease)
  })

  it('never schedules a zero-day interval after a success', () => {
    let card: SrsCard | undefined
    let day = DAY
    for (let i = 0; i < 20; i++) {
      card = review(card, 'hard', day)
      day = card.due
      expect(card.interval).toBeGreaterThanOrEqual(1)
    }
  })
})

describe('lapses', () => {
  it('a wrong answer makes the card due the same day', () => {
    const card = review(undefined, 'again', DAY)
    expect(card.due).toBe(DAY)
    expect(card.interval).toBe(0)
    expect(isDue(card, DAY)).toBe(true)
  })

  it('a wrong answer resets the streak and counts the lapse', () => {
    const matured = drill(['good', 'good', 'good']).card
    expect(matured.streak).toBe(3)
    const lapsed = review(matured, 'again', '2026-11-20')
    expect(lapsed.streak).toBe(0)
    expect(lapsed.lapses).toBe(1)
  })

  it('a lapsed card climbs the ladder again from one day', () => {
    const lapsed = review(drill(['good', 'good']).card, 'again', '2026-11-01')
    const recovered = review(lapsed, 'good', '2026-11-01')
    expect(recovered.interval).toBe(1)
    expect(recovered.due).toBe('2026-11-02')
  })

  it('repeated lapses accumulate', () => {
    let card = review(undefined, 'again', DAY)
    card = review(card, 'again', DAY)
    card = review(card, 'again', DAY)
    expect(card.lapses).toBe(3)
  })

  it('drives ease down but never below the floor', () => {
    let card: SrsCard | undefined
    for (let i = 0; i < 30; i++) card = review(card, 'again', DAY)
    expect(card!.ease).toBe(MIN_EASE)
  })

  it('caps the interval so long runs cannot overflow the date arithmetic', () => {
    let card: SrsCard | undefined
    let day = DAY
    // Far more consecutive "easy" grades than a real player would ever give.
    for (let i = 0; i < 60; i++) {
      card = review(card, 'easy', day)
      day = card.due
      expect(card.interval).toBeLessThanOrEqual(MAX_INTERVAL_DAYS)
      expect(card.due).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('survives a save carrying an absurd stored interval', () => {
    const absurd: SrsCard = {
      interval: Number.MAX_SAFE_INTEGER,
      ease: 2.5,
      streak: 9,
      due: DAY,
      lapses: 0,
    }
    const next = review(absurd, 'good', DAY)
    expect(next.interval).toBeLessThanOrEqual(MAX_INTERVAL_DAYS)
    expect(next.due).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('never lets ease exceed the ceiling', () => {
    let card: SrsCard | undefined
    let day = DAY
    for (let i = 0; i < 30; i++) {
      card = review(card, 'easy', day)
      day = card.due
    }
    expect(card!.ease).toBeLessThanOrEqual(MAX_EASE)
  })
})

describe('the brief: a missed concept comes back', () => {
  it('reappears in the same session it was missed', () => {
    const card = review(undefined, 'again', DAY)
    expect(dueCards({ q1: card }, DAY)).toEqual(['q1'])
  })

  it('a correctly answered card does NOT come back the same day', () => {
    const card = review(undefined, 'good', DAY)
    expect(dueCards({ q1: card }, DAY)).toEqual([])
  })

  it('comes back on exactly the scheduled day, not before', () => {
    const card = drill(['good', 'good']).card // six days out
    const due = card.due
    const dayBefore = (() => {
      const [y, m, d] = due.split('-').map(Number)
      const date = new Date(Date.UTC(y, m - 1, d - 1))
      return date.toISOString().slice(0, 10)
    })()

    expect(isDue(card, dayBefore)).toBe(false)
    expect(isDue(card, due)).toBe(true)
  })

  it('stays due once overdue', () => {
    const card = drill(['good']).card
    expect(isDue(card, '2027-01-01')).toBe(true)
  })
})

describe('dueCards', () => {
  const cards: Record<string, SrsCard> = {
    fresh: { interval: 1, ease: 2.5, streak: 1, due: '2026-10-21', lapses: 0 },
    today: { interval: 0, ease: 2.5, streak: 0, due: '2026-10-20', lapses: 0 },
    overdue: { interval: 3, ease: 2.5, streak: 2, due: '2026-10-10', lapses: 0 },
    veryOverdue: { interval: 3, ease: 2.5, streak: 2, due: '2026-10-01', lapses: 0 },
  }

  it('returns only cards due on or before the day', () => {
    expect(dueCards(cards, DAY).sort()).toEqual(['overdue', 'today', 'veryOverdue'].sort())
  })

  it('orders the most overdue first', () => {
    expect(dueCards(cards, DAY)).toEqual(['veryOverdue', 'overdue', 'today'])
  })

  it('breaks ties towards the shakiest card', () => {
    const tied: Record<string, SrsCard> = {
      steady: { interval: 1, ease: 2.5, streak: 1, due: DAY, lapses: 0 },
      shaky: { interval: 1, ease: 2.5, streak: 1, due: DAY, lapses: 5 },
    }
    expect(dueCards(tied, DAY)[0]).toBe('shaky')
  })

  it('respects a limit', () => {
    expect(dueCards(cards, DAY, 2)).toHaveLength(2)
  })

  it('counts correctly', () => {
    expect(dueCount(cards, DAY)).toBe(3)
    expect(dueCount({}, DAY)).toBe(0)
  })
})

describe('buildSession', () => {
  const all = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6']

  it('is all fresh questions for a brand-new player', () => {
    expect(buildSession({}, all, DAY, 3)).toEqual(['q1', 'q2', 'q3'])
  })

  it('puts due reviews ahead of fresh questions', () => {
    const srs = { q5: { interval: 0, ease: 2.5, streak: 0, due: DAY, lapses: 1 } }
    const session = buildSession(srs, all, DAY, 3)
    expect(session[0]).toBe('q5')
    expect(session).toHaveLength(3)
  })

  it('never exceeds the requested size', () => {
    const srs = Object.fromEntries(
      all.map((id) => [id, { interval: 0, ease: 2.5, streak: 0, due: DAY, lapses: 0 }]),
    )
    expect(buildSession(srs, all, DAY, 4)).toHaveLength(4)
  })

  it('never repeats a question within a session', () => {
    const srs = { q1: { interval: 0, ease: 2.5, streak: 0, due: DAY, lapses: 0 } }
    const session = buildSession(srs, all, DAY, 6)
    expect(new Set(session).size).toBe(session.length)
  })

  it('does not schedule cards that are not due', () => {
    const srs = Object.fromEntries(
      all.map((id) => [id, { interval: 9, ease: 2.5, streak: 3, due: '2027-01-01', lapses: 0 }]),
    )
    // Everything is scheduled far out and nothing is unseen, so the session is empty.
    expect(buildSession(srs, all, DAY, 5)).toEqual([])
  })

  it('returns fewer than asked rather than padding with repeats', () => {
    expect(buildSession({}, ['q1'], DAY, 5)).toEqual(['q1'])
  })
})

describe('interval arithmetic', () => {
  it('crosses month boundaries correctly', () => {
    const card = review(undefined, 'good', '2026-10-31')
    expect(card.due).toBe('2026-11-01')
  })

  it('crosses year boundaries correctly', () => {
    const card = review(undefined, 'good', '2026-12-31')
    expect(card.due).toBe('2027-01-01')
  })

  it('handles leap days', () => {
    const card = review(undefined, 'good', '2028-02-28')
    expect(card.due).toBe('2028-02-29')
  })

  it('due date is always interval days after the review', () => {
    let card: SrsCard | undefined
    let day = DAY
    for (let i = 0; i < 10; i++) {
      card = review(card, 'good', day)
      expect(daysBetween(day, card.due)).toBe(card.interval)
      day = card.due
    }
  })
})
