import type { PhishingLab } from '@/content/schemas'

/**
 * Phishing triage. The player inspects an email's headers, links and
 * attachments and calls it: phish or legitimate.
 *
 * The emails are content, not fetched mail. Nothing is sent or received.
 */

export type PhishingVerdict = 'phish' | 'legitimate'

export type PhishingState = {
  index: number
  /** Verdicts given so far, keyed by email id. */
  verdicts: Record<string, PhishingVerdict>
  /** Whether the current email's tells have been revealed. */
  revealed: boolean
  headersOpen: boolean
}

export function startPhishing(): PhishingState {
  return { index: 0, verdicts: {}, revealed: false, headersOpen: false }
}

export function currentEmail(lab: PhishingLab, state: PhishingState) {
  return lab.emails[state.index] ?? null
}

export function judge(
  lab: PhishingLab,
  state: PhishingState,
  verdict: PhishingVerdict,
): PhishingState {
  const email = currentEmail(lab, state)
  if (!email || email.id in state.verdicts) return state
  return {
    ...state,
    verdicts: { ...state.verdicts, [email.id]: verdict },
    revealed: true,
  }
}

export function nextEmail(lab: PhishingLab, state: PhishingState): PhishingState {
  if (state.index + 1 >= lab.emails.length) return { ...state, revealed: false }
  return { ...state, index: state.index + 1, revealed: false, headersOpen: false }
}

export function toggleHeaders(state: PhishingState): PhishingState {
  return { ...state, headersOpen: !state.headersOpen }
}

export function isFinished(lab: PhishingLab, state: PhishingState): boolean {
  return lab.emails.every((e) => e.id in state.verdicts)
}

export type PhishingScore = {
  correct: number
  total: number
  /** Legitimate mail wrongly called a phish - the cost of over-blocking. */
  falseAlarms: number
  /** Phishing wrongly called legitimate - the one that lets an attacker in. */
  missed: number
}

export function scorePhishing(lab: PhishingLab, state: PhishingState): PhishingScore {
  let correct = 0
  let falseAlarms = 0
  let missed = 0

  for (const email of lab.emails) {
    const given = state.verdicts[email.id]
    if (!given) continue
    if (given === email.verdict) correct++
    else if (email.verdict === 'legitimate') falseAlarms++
    else missed++
  }

  return { correct, total: lab.emails.length, falseAlarms, missed }
}
