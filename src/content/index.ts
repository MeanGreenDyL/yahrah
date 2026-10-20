import securityPlusRaw from '../../content/objectives/securityplus-sy0-701.json'
import csfRaw from '../../content/objectives/nist-csf-2.0.json'
import { securityPlusFrameworkSchema, csfFrameworkSchema } from './schemas'

/**
 * The curriculum spine, parsed once at module load.
 *
 * These files are also checked by `npm run validate-content` in CI, so a
 * parse failure here means something got past the validator - fail loudly
 * rather than limping along with a half-built curriculum.
 */

const sp = securityPlusFrameworkSchema.safeParse(securityPlusRaw)
if (!sp.success) {
  throw new Error(`Security+ objective spine is invalid: ${sp.error.issues[0]?.message}`)
}

const csf = csfFrameworkSchema.safeParse(csfRaw)
if (!csf.success) {
  throw new Error(`NIST CSF spine is invalid: ${csf.error.issues[0]?.message}`)
}

export const SECURITY_PLUS = sp.data
export const CSF = csf.data

/** Every Security+ objective, flattened, with its domain attached. */
export const OBJECTIVES = SECURITY_PLUS.domains.flatMap((domain) =>
  domain.objectives.map((objective) => ({
    ...objective,
    domainId: domain.id,
    domainName: domain.name,
    domainWeight: domain.weight,
  })),
)

export const OBJECTIVE_BY_ID = new Map(OBJECTIVES.map((o) => [o.id, o]))

/** Every CSF category, flattened, with its Function attached. */
export const CSF_CATEGORIES = CSF.functions.flatMap((fn) =>
  fn.categories.map((category) => ({
    ...category,
    functionId: fn.id,
    functionName: fn.name,
  })),
)

export const CSF_CATEGORY_BY_ID = new Map(CSF_CATEGORIES.map((c) => [c.id, c]))

/**
 * True until BOTH spines have been read from the primary document itself.
 * "Corroborated against the publisher's own site" is good, but it still
 * leaves exact wording unconfirmed, and the dashboard says so.
 */
export const CURRICULUM_NEEDS_REVIEW =
  SECURITY_PLUS.verification.status !== 'verified-primary-source' ||
  CSF.verification.status !== 'verified-primary-source'

/** How each spine is currently sourced, for the dashboard to report. */
export const CURRICULUM_VERIFICATION = {
  securityPlus: SECURITY_PLUS.verification,
  csf: CSF.verification,
}

// ---------------------------------------------------------------------------
// Game content
// ---------------------------------------------------------------------------

import creaturesRaw from '../../content/creatures/hakumura.json'
import questionsRaw from '../../content/questions/hakumura.json'
import terminalLabRaw from '../../content/labs/hakumura-terminal.json'
import logsLabRaw from '../../content/labs/hakumura-logs.json'
import phishingLabRaw from '../../content/labs/hakumura-phishing.json'
import lessonsRaw from '../../content/lessons/hakumura.json'
import bossesRaw from '../../content/bosses/hakumura.json'
import zonesRaw from '../../content/zones/hakumura.json'
import {
  bossSchema,
  creatureSchema,
  labSchema,
  lessonSchema,
  questionSchema,
  zoneSchema,
} from './schemas'
import { z } from 'zod'

function parseAll<T extends z.ZodTypeAny>(raw: unknown, schema: T, label: string): z.infer<T>[] {
  const result = z.array(schema).safeParse(raw)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new Error(`${label} content is invalid at ${issue?.path.join('.')}: ${issue?.message}`)
  }
  return result.data
}

export const CREATURES = parseAll(creaturesRaw, creatureSchema, 'Creature')
export const CREATURE_BY_ID = new Map(CREATURES.map((c) => [c.id, c]))

export const QUESTIONS = parseAll(questionsRaw, questionSchema, 'Question')
export const QUESTION_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]))

export const LABS = [
  ...parseAll(terminalLabRaw, labSchema, 'Terminal lab'),
  ...parseAll(logsLabRaw, labSchema, 'Logs lab'),
  ...parseAll(phishingLabRaw, labSchema, 'Phishing lab'),
]
export const LAB_BY_ID = new Map(LABS.map((l) => [l.id, l]))

export const LESSONS = parseAll(lessonsRaw, lessonSchema, 'Lesson')
export const LESSON_BY_ID = new Map(LESSONS.map((l) => [l.id, l]))

export const BOSSES = parseAll(bossesRaw, bossSchema, 'Boss')
export const BOSS_BY_ID = new Map(BOSSES.map((b) => [b.id, b]))

export const ZONES = parseAll(zonesRaw, zoneSchema, 'Zone')
export const ZONE_BY_ID = new Map(ZONES.map((z) => [z.id, z]))

export const KAGEMONO = CREATURES.filter((c) => c.kind === 'kagemono')
export const MAMORI = CREATURES.filter((c) => c.kind === 'mamori')
export const DOUGU = CREATURES.filter((c) => c.kind === 'dougu')

/** Every curriculum reference a question carries, for recording mastery. */
export function refsFor(questionId: string): string[] {
  const question = QUESTION_BY_ID.get(questionId)
  if (!question) return []
  return [...question.tags.objectives, ...question.tags.csf]
}
