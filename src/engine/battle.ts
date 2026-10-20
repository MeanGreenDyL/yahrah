import type { Grade } from './srs'

/**
 * The quiz battle. A Kagemono's health falls as you answer correctly; yours
 * falls when you do not.
 *
 * The whole thing is a reducer over pure data: `startBattle` then `answer`.
 * No timers, no randomness inside the state transition, so every rule here
 * is testable and a battle can be replayed exactly from its inputs.
 */

export type Element = 'signal' | 'ember' | 'iron' | 'shade' | 'writ' | 'mind' | 'coin'

/**
 * A single cycle: each element beats the next and is beaten by the previous.
 * Readable, balanced, and impossible to get internally inconsistent.
 */
const CYCLE: Element[] = ['signal', 'ember', 'iron', 'shade', 'writ', 'mind', 'coin']

export const STRONG = 1.5
export const WEAK = 0.75
export const NEUTRAL = 1

/** Damage multiplier for `attacker` striking `defender`. */
export function effectiveness(attacker: Element, defender: Element): number {
  const a = CYCLE.indexOf(attacker)
  const d = CYCLE.indexOf(defender)
  if (a < 0 || d < 0) return NEUTRAL
  if ((a + 1) % CYCLE.length === d) return STRONG
  if ((d + 1) % CYCLE.length === a) return WEAK
  return NEUTRAL
}

export function effectivenessLabel(multiplier: number): string {
  if (multiplier > NEUTRAL) return "It's a clean cut."
  if (multiplier < NEUTRAL) return 'It barely bites.'
  return 'A solid hit.'
}

export type Foe = {
  creatureId: string
  name: string
  element: Element
  maxHp: number
}

export type BattlePhase = 'question' | 'feedback' | 'won' | 'lost'

export type AnswerOutcome = {
  correct: boolean
  grade: Grade
  damageDealt: number
  damageTaken: number
  multiplier: number
  explanation: string
}

export type BattleState = {
  foe: Foe
  foeHp: number
  playerHp: number
  playerMaxHp: number
  /** The element of the Mamori the player has equipped. */
  element: Element
  queue: string[]
  index: number
  phase: BattlePhase
  last: AnswerOutcome | null
  xpEarned: number
  correctCount: number
  answeredCount: number
  /** Question ids answered wrongly, re-queued before the battle can end. */
  pending: string[]
}

export const BASE_DAMAGE = 34
export const FOE_DAMAGE = 20
export const PLAYER_MAX_HP = 100
export const XP_PER_CORRECT = 12
export const XP_WIN_BONUS = 40

export function startBattle(foe: Foe, questionIds: string[], element: Element): BattleState {
  return {
    foe,
    foeHp: foe.maxHp,
    playerHp: PLAYER_MAX_HP,
    playerMaxHp: PLAYER_MAX_HP,
    element,
    queue: [...questionIds],
    index: 0,
    phase: questionIds.length === 0 ? 'won' : 'question',
    last: null,
    xpEarned: 0,
    correctCount: 0,
    answeredCount: 0,
    pending: [],
  }
}

/** The question currently being asked, or null when the battle is over. */
export function currentQuestionId(state: BattleState): string | null {
  if (state.phase === 'won' || state.phase === 'lost') return null
  return state.queue[state.index] ?? null
}

/**
 * Grade an answer. `usedHint` softens a correct answer to "hard" so the
 * scheduler knows it was not clean recall.
 */
export function gradeFor(correct: boolean, usedHint: boolean): Grade {
  if (!correct) return 'again'
  return usedHint ? 'hard' : 'good'
}

/**
 * Answer the current question. Returns the next state; the caller supplies
 * correctness and the explanation so this stays free of content lookups.
 */
export function answer(
  state: BattleState,
  correct: boolean,
  explanation: string,
  usedHint = false,
): BattleState {
  if (state.phase === 'won' || state.phase === 'lost') return state

  const questionId = currentQuestionId(state)
  if (questionId === null) return state

  const multiplier = effectiveness(state.element, state.foe.element)
  const damageDealt = correct ? Math.round(BASE_DAMAGE * multiplier) : 0
  const damageTaken = correct ? 0 : FOE_DAMAGE

  const foeHp = Math.max(0, state.foeHp - damageDealt)
  const playerHp = Math.max(0, state.playerHp - damageTaken)

  // A missed question is re-queued, so you cannot finish a battle on a
  // concept you never got right.
  const pending = correct ? state.pending : [...state.pending, questionId]

  const outcome: AnswerOutcome = {
    correct,
    grade: gradeFor(correct, usedHint),
    damageDealt,
    damageTaken,
    multiplier,
    explanation,
  }

  return {
    ...state,
    foeHp,
    playerHp,
    last: outcome,
    phase: 'feedback',
    xpEarned: state.xpEarned + (correct ? XP_PER_CORRECT : 0),
    correctCount: state.correctCount + (correct ? 1 : 0),
    answeredCount: state.answeredCount + 1,
    pending,
  }
}

/**
 * Leave the feedback screen and move on. Resolves the battle when the foe
 * is down, the player is down, or the queue (including re-queued misses)
 * is exhausted.
 */
export function advance(state: BattleState): BattleState {
  if (state.phase !== 'feedback') return state

  if (state.playerHp <= 0) return { ...state, phase: 'lost' }
  if (state.foeHp <= 0) {
    return { ...state, phase: 'won', xpEarned: state.xpEarned + XP_WIN_BONUS }
  }

  const nextIndex = state.index + 1
  if (nextIndex < state.queue.length) {
    return { ...state, index: nextIndex, phase: 'question', last: null }
  }

  // Out of questions: bring back anything missed, otherwise the battle ends.
  if (state.pending.length > 0) {
    return {
      ...state,
      queue: [...state.queue, ...state.pending],
      pending: [],
      index: nextIndex,
      phase: 'question',
      last: null,
    }
  }

  return { ...state, phase: 'won', xpEarned: state.xpEarned + XP_WIN_BONUS }
}

/** Accuracy over the battle, 0..1. */
export function accuracy(state: BattleState): number {
  return state.answeredCount === 0 ? 0 : state.correctCount / state.answeredCount
}
