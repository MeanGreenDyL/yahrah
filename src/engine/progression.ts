/**
 * XP and levelling.
 *
 * The curve is gentle early so a first session produces two or three
 * level-ups, then widens so later levels feel earned. Closed-form rather
 * than a lookup table, so it never runs out of levels.
 */

/** XP needed to advance from `level` to `level + 1`. */
export function xpForNextLevel(level: number): number {
  const l = Math.max(1, Math.floor(level))
  return 80 + 40 * l
}

/** Cumulative XP required to have reached `level`. Level 1 costs nothing. */
export function totalXpForLevel(level: number): number {
  const l = Math.max(1, Math.floor(level))
  // Sum of (80 + 40i) for i = 1..l-1
  return (l - 1) * 80 + 20 * l * (l - 1)
}

/** The level a given lifetime XP total corresponds to. */
export function levelFromXp(xp: number): number {
  const total = Math.max(0, Math.floor(xp))
  // Solve 20L^2 + 60L - 80 <= total for L, then walk to be exact.
  let level = Math.max(1, Math.floor((-60 + Math.sqrt(3600 + 80 * (total + 80))) / 40))
  while (totalXpForLevel(level + 1) <= total) level++
  while (level > 1 && totalXpForLevel(level) > total) level--
  return level
}

/** XP earned since the current level began. */
export function xpIntoLevel(xp: number): number {
  const total = Math.max(0, Math.floor(xp))
  return total - totalXpForLevel(levelFromXp(total))
}

export type XpAward = {
  xp: number
  level: number
  leveledUp: boolean
  levelsGained: number
}

/** Apply an XP award, reporting whether it crossed a level boundary. */
export function awardXp(currentXp: number, amount: number): XpAward {
  const before = levelFromXp(currentXp)
  const xp = Math.max(0, Math.floor(currentXp) + Math.max(0, Math.floor(amount)))
  const level = levelFromXp(xp)
  return { xp, level, leveledUp: level > before, levelsGained: level - before }
}

/**
 * Mastery as a 0..1 ratio, with a confidence penalty so three lucky answers
 * do not read as expertise.
 */
export function masteryRatio(seen: number, correct: number): number {
  if (seen <= 0) return 0
  const accuracy = Math.min(1, Math.max(0, correct / seen))
  // Ramp to full weight at 8 attempts.
  const confidence = Math.min(1, seen / 8)
  return accuracy * confidence
}
