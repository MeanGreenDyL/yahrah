/**
 * Deterministic shuffling.
 *
 * Answer choices must not sit in a fixed order: authored content tends to
 * list the correct answer first, and a player who notices that stops
 * reading. Shuffling seeded by the question id keeps the order stable for
 * a given question (so the UI does not reorder under the player's thumb
 * mid-render) while varying it across questions.
 */

/** A small, fast, fully deterministic PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashSeed(value: string): number {
  let hash = 2166136261
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Fisher-Yates, seeded. Returns a new array; the input is untouched. */
export function shuffleSeeded<T>(items: readonly T[], seed: string): T[] {
  const out = [...items]
  const random = mulberry32(hashSeed(seed))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
