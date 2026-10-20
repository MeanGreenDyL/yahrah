import { z } from 'zod'

/**
 * The save file. Versioned from day one: `migrate()` upgrades any older
 * shape to the current one, so a player's progress survives schema changes.
 *
 * Saves are also the export/import format, so this schema doubles as the
 * validator for a file the player hands back to us.
 */

export const SAVE_VERSION = 1

/** Per-question scheduling state. The scheduler itself lands in M3. */
export const srsCardSchema = z.object({
  /** Current interval in days. */
  interval: z.number().min(0),
  /** SM-2 style ease factor. */
  ease: z.number().min(1.3).max(3.0),
  /** Consecutive correct answers. */
  streak: z.number().int().min(0),
  /** ISO day string (YYYY-MM-DD) this card is next due. */
  due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  lapses: z.number().int().min(0),
})

export const masterySchema = z.object({
  seen: z.number().int().min(0),
  correct: z.number().int().min(0),
})

export const settingsSchema = z.object({
  /** Audio is off on first load, always. */
  audio: z.boolean(),
  /** 'auto' follows prefers-reduced-motion. */
  motion: z.enum(['auto', 'full', 'reduced']),
  /** Multiplier applied to every font size. */
  textScale: z.number().min(0.8).max(1.6),
})

export const saveSchema = z.object({
  version: z.literal(SAVE_VERSION),
  createdAt: z.string(),
  updatedAt: z.string(),
  profile: z.object({
    name: z.string().min(1).max(24),
    clanId: z.enum(['akazora', 'aoyane', 'fujizome']).nullable(),
    level: z.number().int().min(1),
    xp: z.number().int().min(0),
    /** Whether the Three Vows have been acknowledged. */
    vowsAccepted: z.boolean(),
  }),
  streak: z.object({
    current: z.number().int().min(0),
    longest: z.number().int().min(0),
    /** ISO day string of the last day a session was played. */
    lastPlayedDay: z.string().nullable(),
  }),
  progress: z.object({
    lessonsCompleted: z.array(z.string()),
    labsCompleted: z.array(z.string()),
    bossesDefeated: z.array(z.string()),
    creaturesCaught: z.array(z.string()),
    badges: z.array(z.string()),
  }),
  /** Keyed by Security+ objective id, e.g. "SP.1.2". */
  mastery: z.record(z.string(), masterySchema),
  /** Keyed by question id. */
  srs: z.record(z.string(), srsCardSchema),
  settings: settingsSchema,
})

export type Save = z.infer<typeof saveSchema>
export type Settings = z.infer<typeof settingsSchema>
export type SrsCard = z.infer<typeof srsCardSchema>
export type Mastery = z.infer<typeof masterySchema>

/** ISO day string in local time, e.g. "2026-10-20". */
export function today(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function newSave(now: Date = new Date()): Save {
  const stamp = now.toISOString()
  return {
    version: SAVE_VERSION,
    createdAt: stamp,
    updatedAt: stamp,
    profile: { name: 'Warden', clanId: null, level: 1, xp: 0, vowsAccepted: false },
    streak: { current: 0, longest: 0, lastPlayedDay: null },
    progress: {
      lessonsCompleted: [],
      labsCompleted: [],
      bossesDefeated: [],
      creaturesCaught: [],
      badges: [],
    },
    mastery: {},
    srs: {},
    // Audio off by default on first load - a non-negotiable from the brief.
    settings: { audio: false, motion: 'auto', textScale: 1 },
  }
}

export class SaveMigrationError extends Error {}

/**
 * Upgrade any stored save to the current version.
 *
 * Unknown-but-newer versions are refused rather than silently coerced: a
 * player who opened the game on a newer build should not have their progress
 * quietly downgraded.
 */
export function migrate(raw: unknown): Save {
  if (typeof raw !== 'object' || raw === null) {
    throw new SaveMigrationError('save is not an object')
  }

  const version = (raw as { version?: unknown }).version
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveMigrationError('save has no usable version field')
  }
  if (version > SAVE_VERSION) {
    throw new SaveMigrationError(
      `save version ${version} is newer than this build understands (${SAVE_VERSION})`,
    )
  }

  // Future migrations chain here:
  //   let data = raw
  //   if (version < 2) data = v1ToV2(data)

  const parsed = saveSchema.safeParse(raw)
  if (!parsed.success) {
    throw new SaveMigrationError(
      `save failed validation: ${parsed.error.issues
        .slice(0, 3)
        .map((i) => `${i.path.join('.')} ${i.message}`)
        .join('; ')}`,
    )
  }
  return parsed.data
}

/** Serialise for export. Pretty-printed so a curious player can read it. */
export function exportSave(save: Save): string {
  return JSON.stringify(save, null, 2)
}

/** Parse an imported file. Throws SaveMigrationError with a readable reason. */
export function importSave(text: string): Save {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new SaveMigrationError('that file is not valid JSON')
  }
  return migrate(raw)
}

/**
 * Apply a day's play to the streak. Same day is a no-op; the next calendar
 * day extends; any longer gap resets to 1.
 */
export function touchStreak(save: Save, day: string): Save {
  const last = save.streak.lastPlayedDay
  if (last === day) return save

  let current: number
  if (last === null) {
    current = 1
  } else {
    const gap = daysBetween(last, day)
    current = gap === 1 ? save.streak.current + 1 : 1
  }

  return {
    ...save,
    streak: {
      current,
      longest: Math.max(save.streak.longest, current),
      lastPlayedDay: day,
    },
  }
}

/** Whole days from one ISO day string to another. Negative if `b` is earlier. */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)
  return Math.round(ms / 86_400_000)
}
