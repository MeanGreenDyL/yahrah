import { describe, it, expect } from 'vitest'
import {
  startBattle,
  answer,
  advance,
  currentQuestionId,
  effectiveness,
  effectivenessLabel,
  gradeFor,
  accuracy,
  STRONG,
  WEAK,
  NEUTRAL,
  PLAYER_MAX_HP,
  FOE_DAMAGE,
  XP_PER_CORRECT,
  XP_WIN_BONUS,
  type Element,
  type Foe,
  type BattleState,
} from '@/engine/battle'

const ELEMENTS: Element[] = ['signal', 'ember', 'iron', 'shade', 'writ', 'mind', 'coin']

const foe: Foe = { creatureId: 'k-phish-lure', name: 'Lurebright', element: 'ember', maxHp: 100 }

/** Answer and immediately advance, the way the UI does. */
function turn(state: BattleState, correct: boolean): BattleState {
  return advance(answer(state, correct, 'because'))
}

describe('effectiveness', () => {
  it('is a consistent cycle: every element beats exactly one', () => {
    for (const attacker of ELEMENTS) {
      const strong = ELEMENTS.filter((d) => effectiveness(attacker, d) === STRONG)
      expect(strong).toHaveLength(1)
    }
  })

  it('every element is beaten by exactly one', () => {
    for (const defender of ELEMENTS) {
      const weak = ELEMENTS.filter((a) => effectiveness(a, defender) === STRONG)
      expect(weak).toHaveLength(1)
    }
  })

  it('is symmetric: if A beats B, B resists A', () => {
    for (const a of ELEMENTS) {
      for (const b of ELEMENTS) {
        if (effectiveness(a, b) === STRONG) expect(effectiveness(b, a)).toBe(WEAK)
      }
    }
  })

  it('is neutral against itself', () => {
    for (const e of ELEMENTS) expect(effectiveness(e, e)).toBe(NEUTRAL)
  })

  it('falls back to neutral for an unknown element', () => {
    expect(effectiveness('nonsense' as Element, 'ember')).toBe(NEUTRAL)
  })

  it('labels each band distinctly', () => {
    const labels = new Set([
      effectivenessLabel(STRONG),
      effectivenessLabel(NEUTRAL),
      effectivenessLabel(WEAK),
    ])
    expect(labels.size).toBe(3)
  })
})

describe('startBattle', () => {
  it('opens on the first question at full health', () => {
    const state = startBattle(foe, ['q1', 'q2'], 'signal')
    expect(state.phase).toBe('question')
    expect(currentQuestionId(state)).toBe('q1')
    expect(state.playerHp).toBe(PLAYER_MAX_HP)
    expect(state.foeHp).toBe(foe.maxHp)
  })

  it('is already won with an empty queue rather than hanging', () => {
    expect(startBattle(foe, [], 'signal').phase).toBe('won')
  })
})

describe('answering', () => {
  it('a correct answer damages the foe and not the player', () => {
    const state = answer(startBattle(foe, ['q1'], 'signal'), true, 'why')
    expect(state.foeHp).toBeLessThan(foe.maxHp)
    expect(state.playerHp).toBe(PLAYER_MAX_HP)
    expect(state.last?.correct).toBe(true)
  })

  it('a wrong answer damages the player and not the foe', () => {
    const state = answer(startBattle(foe, ['q1'], 'signal'), false, 'why')
    expect(state.foeHp).toBe(foe.maxHp)
    expect(state.playerHp).toBe(PLAYER_MAX_HP - FOE_DAMAGE)
  })

  it('always carries an explanation, right or wrong', () => {
    const right = answer(startBattle(foe, ['q1'], 'signal'), true, 'the reason')
    const wrong = answer(startBattle(foe, ['q1'], 'signal'), false, 'the reason')
    expect(right.last?.explanation).toBe('the reason')
    expect(wrong.last?.explanation).toBe('the reason')
  })

  it('hits harder with a favourable element', () => {
    // The foe is ember. In the cycle signal beats ember, ember beats iron,
    // and shade is unrelated to ember.
    const strong = answer(startBattle(foe, ['q1'], 'signal'), true, 'x')
    const neutral = answer(startBattle(foe, ['q1'], 'shade'), true, 'x')
    const weak = answer(startBattle(foe, ['q1'], 'iron'), true, 'x')

    expect(effectiveness('signal', 'ember')).toBe(STRONG)
    expect(effectiveness('shade', 'ember')).toBe(NEUTRAL)
    expect(effectiveness('iron', 'ember')).toBe(WEAK)

    expect(strong.last!.damageDealt).toBeGreaterThan(neutral.last!.damageDealt)
    expect(weak.last!.damageDealt).toBeLessThan(neutral.last!.damageDealt)
  })

  it('awards xp only for correct answers', () => {
    expect(answer(startBattle(foe, ['q1'], 'signal'), true, 'x').xpEarned).toBe(XP_PER_CORRECT)
    expect(answer(startBattle(foe, ['q1'], 'signal'), false, 'x').xpEarned).toBe(0)
  })

  it('never drives health below zero', () => {
    let state = startBattle({ ...foe, maxHp: 10 }, ['q1', 'q2', 'q3'], 'signal')
    state = answer(state, true, 'x')
    expect(state.foeHp).toBe(0)

    let losing = startBattle(foe, Array.from({ length: 20 }, (_, i) => `q${i}`), 'signal')
    for (let i = 0; i < 20 && losing.phase !== 'lost'; i++) losing = turn(losing, false)
    expect(losing.playerHp).toBe(0)
  })

  it('is inert once the battle is decided', () => {
    const won = { ...startBattle(foe, ['q1'], 'signal'), phase: 'won' as const }
    expect(answer(won, true, 'x')).toBe(won)
    expect(advance(won)).toBe(won)
  })
})

describe('grades feed the scheduler', () => {
  it('maps a miss to "again"', () => {
    expect(gradeFor(false, false)).toBe('again')
  })

  it('maps clean recall to "good"', () => {
    expect(gradeFor(true, false)).toBe('good')
  })

  it('softens a hinted answer to "hard"', () => {
    expect(gradeFor(true, true)).toBe('hard')
  })

  it('a hinted answer still counts as correct', () => {
    const state = answer(startBattle(foe, ['q1'], 'signal'), true, 'x', true)
    expect(state.last?.correct).toBe(true)
    expect(state.last?.grade).toBe('hard')
  })
})

describe('the brief: you cannot finish on a question you never got right', () => {
  it('re-queues a missed question before the battle can end', () => {
    let state = startBattle({ ...foe, maxHp: 1000 }, ['q1'], 'signal')
    state = turn(state, false)
    // The queue ran out, but q1 was missed, so it comes back.
    expect(state.phase).toBe('question')
    expect(currentQuestionId(state)).toBe('q1')
  })

  it('ends once the re-queued question is answered correctly', () => {
    let state = startBattle({ ...foe, maxHp: 1000 }, ['q1'], 'signal')
    state = turn(state, false)
    state = turn(state, true)
    expect(state.phase).toBe('won')
  })

  it('does not re-queue a question answered correctly', () => {
    let state = startBattle({ ...foe, maxHp: 1000 }, ['q1', 'q2'], 'signal')
    state = turn(state, true)
    state = turn(state, true)
    expect(state.phase).toBe('won')
    expect(state.answeredCount).toBe(2)
  })
})

describe('resolution', () => {
  it('is won when the foe falls', () => {
    let state = startBattle({ ...foe, maxHp: 30 }, ['q1', 'q2'], 'signal')
    state = turn(state, true)
    expect(state.phase).toBe('won')
  })

  it('adds the win bonus exactly once', () => {
    let state = startBattle({ ...foe, maxHp: 30 }, ['q1'], 'signal')
    state = turn(state, true)
    expect(state.xpEarned).toBe(XP_PER_CORRECT + XP_WIN_BONUS)
    expect(advance(state).xpEarned).toBe(state.xpEarned)
  })

  it('is lost when the player falls, even with questions left', () => {
    const many = Array.from({ length: 30 }, (_, i) => `q${i}`)
    let state = startBattle({ ...foe, maxHp: 1000 }, many, 'signal')
    for (let i = 0; i < 30 && state.phase !== 'lost'; i++) state = turn(state, false)
    expect(state.phase).toBe('lost')
  })

  it('losing takes priority over winning on the same turn', () => {
    // Player on their last legs; a wrong answer must lose, not continue.
    let state = startBattle({ ...foe, maxHp: 1 }, ['q1', 'q2'], 'signal')
    state = { ...state, playerHp: FOE_DAMAGE }
    state = turn(state, false)
    expect(state.phase).toBe('lost')
  })

  it('walks a full battle to a win without getting stuck', () => {
    let state = startBattle(foe, ['q1', 'q2', 'q3', 'q4', 'q5'], 'signal')
    let guard = 0
    while (state.phase !== 'won' && state.phase !== 'lost' && guard++ < 50) {
      state = turn(state, true)
    }
    expect(state.phase).toBe('won')
    expect(guard).toBeLessThan(50)
  })

  it('terminates even on an all-wrong-then-right run', () => {
    let state = startBattle({ ...foe, maxHp: 10_000 }, ['q1', 'q2'], 'signal')
    let guard = 0
    // Miss everything once, then answer everything correctly.
    state = turn(state, false)
    state = turn(state, false)
    while (state.phase !== 'won' && state.phase !== 'lost' && guard++ < 50) {
      state = turn(state, true)
    }
    expect(['won', 'lost']).toContain(state.phase)
    expect(guard).toBeLessThan(50)
  })
})

describe('accuracy', () => {
  it('is zero before anything is answered', () => {
    expect(accuracy(startBattle(foe, ['q1'], 'signal'))).toBe(0)
  })

  it('tracks the correct fraction', () => {
    let state = startBattle({ ...foe, maxHp: 10_000 }, ['q1', 'q2', 'q3', 'q4'], 'signal')
    state = turn(state, true)
    state = turn(state, false)
    expect(accuracy(state)).toBe(0.5)
  })
})
