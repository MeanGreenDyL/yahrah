import { z } from 'zod'

/**
 * Every piece of Yahrah content is validated against these schemas by
 * `npm run validate-content`. The objective files are the single source of
 * truth for curriculum IDs: lessons, questions and labs may only reference
 * IDs that exist there, and the validator fails the build on a dangling ref.
 */

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Security+ objective id, e.g. "SP.1.2" (domain.objective). */
export const securityPlusObjectiveId = z
  .string()
  .regex(/^SP\.\d+\.\d+$/, 'must look like SP.<domain>.<objective>, e.g. SP.1.2')

/** NIST CSF 2.0 category id, e.g. "PR.AA", or a bare Function id, e.g. "PR". */
export const csfRefId = z
  .string()
  .regex(/^(GV|ID|PR|DE|RS|RC)(\.[A-Z]{2})?$/, 'must be a CSF Function (PR) or Category (PR.AA)')

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'must be a lowercase slug')

/**
 * Anything we could not confirm against a primary source carries this.
 * The honesty valve: content states uncertainty rather than asserting it.
 */
const reviewable = {
  needs_review: z.boolean().optional(),
  review_note: z.string().min(1).optional(),
}

/** A citation back to docs/research/, so claims stay traceable. */
export const sourceRef = z.object({
  title: z.string().min(1),
  url: z.string().url(),
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

/** Curriculum tagging. At least one Security+ objective is mandatory. */
export const curriculumTags = z.object({
  objectives: z.array(securityPlusObjectiveId).min(1, 'tag at least one Security+ objective'),
  csf: z.array(csfRefId).default([]),
  frameworks: z.array(z.string().min(1)).default([]),
})

// ---------------------------------------------------------------------------
// Objective spine
// ---------------------------------------------------------------------------

const verification = z.object({
  status: z.enum(['verified-primary-source', 'unverified-primary-source']),
  needs_review: z.boolean().optional(),
  note: z.string().min(1),
  checked_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

export const securityPlusFrameworkSchema = z.object({
  framework: z.literal('comptia-security-plus'),
  version: z.string().min(1),
  title: z.string().min(1),
  verification,
  successor: z
    .object({
      version: z.string().min(1),
      expected_launch: z.string().optional(),
      sy0_701_valid_until: z.string().optional(),
      needs_review: z.boolean().optional(),
      note: z.string().optional(),
    })
    .optional(),
  domains: z
    .array(
      z.object({
        id: z.string().regex(/^SP\.\d+$/),
        number: z.string().min(1),
        name: z.string().min(1),
        weight: z.number().int().min(1).max(100),
        objectives: z
          .array(
            z.object({
              id: securityPlusObjectiveId,
              number: z.string().min(1),
              statement: z.string().min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
})

export const csfFrameworkSchema = z.object({
  framework: z.literal('nist-csf'),
  version: z.string().min(1),
  title: z.string().min(1),
  verification,
  functions: z
    .array(
      z.object({
        id: z.enum(['GV', 'ID', 'PR', 'DE', 'RS', 'RC']),
        name: z.string().min(1),
        summary: z.string().min(1),
        categories: z
          .array(
            z.object({
              id: csfRefId,
              name: z.string().min(1),
            }),
          )
          .min(1),
      }),
    )
    .length(6, 'CSF 2.0 has exactly six Functions'),
})

// ---------------------------------------------------------------------------
// Creatures: Kagemono (threats), Mamori (controls), Dougu (real tools)
// ---------------------------------------------------------------------------

export const creatureKind = z.enum(['kagemono', 'mamori', 'dougu'])

/**
 * Sprites are palette-indexed pixel grids, not image files. Each row is a
 * string of characters; each character indexes into `palette`. "." is
 * transparent. This keeps art original, diffable and asset-free.
 */
export const spriteSchema = z
  .object({
    width: z.number().int().min(4).max(64),
    height: z.number().int().min(4).max(64),
    palette: z.record(z.string().length(1), z.string().regex(/^#[0-9a-fA-F]{6}$/)),
    rows: z.array(z.string().min(1)).min(4),
  })
  .superRefine((sprite, ctx) => {
    if (sprite.rows.length !== sprite.height) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `sprite declares height ${sprite.height} but has ${sprite.rows.length} rows`,
      })
    }
    sprite.rows.forEach((row, i) => {
      if (row.length !== sprite.width) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `sprite row ${i} has ${row.length} cells, expected ${sprite.width}`,
        })
      }
      for (const ch of row) {
        if (ch !== '.' && !(ch in sprite.palette)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `sprite row ${i} uses colour key "${ch}" which is not in the palette`,
          })
        }
      }
    })
  })

export const creatureSchema = z.object({
  id: slug,
  kind: creatureKind,
  name: z.string().min(1),
  /** The real-world thing this creature represents, named plainly. */
  realWorld: z.string().min(1),
  /** Why it matters, in two or three sentences a beginner can follow. */
  explanation: z.string().min(40),
  element: z.enum(['signal', 'ember', 'iron', 'shade', 'writ', 'mind', 'coin']),
  rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
  stats: z.object({
    guile: z.number().int().min(1).max(200),
    reach: z.number().int().min(1).max(200),
    resolve: z.number().int().min(1).max(200),
  }),
  /** The control/concept that counters it. Must be another creature id. */
  weakness: slug,
  sprite: spriteSchema,
  tags: curriculumTags,
  sources: z.array(sourceRef).default([]),
  ...reviewable,
})

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

const questionBase = {
  id: slug,
  prompt: z.string().min(10),
  /** Shown after answering, right or wrong. Never optional - this is the teaching. */
  explanation: z.string().min(40),
  difficulty: z.number().int().min(1).max(5),
  tags: curriculumTags,
  sources: z.array(sourceRef).default([]),
  ...reviewable,
}

export const questionSchema = z.discriminatedUnion('type', [
  z.object({
    ...questionBase,
    type: z.literal('single'),
    choices: z
      .array(z.object({ id: slug, text: z.string().min(1), why: z.string().min(1) }))
      .min(2)
      .max(6),
    answer: slug,
  }),
  z.object({
    ...questionBase,
    type: z.literal('multi'),
    choices: z
      .array(z.object({ id: slug, text: z.string().min(1), why: z.string().min(1) }))
      .min(3)
      .max(8),
    answers: z.array(slug).min(2),
  }),
  z.object({
    ...questionBase,
    type: z.literal('order'),
    items: z.array(z.object({ id: slug, text: z.string().min(1) })).min(3),
    /** Correct ordering, as item ids. */
    answer: z.array(slug).min(3),
  }),
  z.object({
    ...questionBase,
    type: z.literal('match'),
    pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(2),
  }),
])

// ---------------------------------------------------------------------------
// Lessons: dialog-box beats
// ---------------------------------------------------------------------------

export const lessonBeatSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('dialog'),
    speaker: z.string().min(1),
    text: z.string().min(1),
  }),
  z.object({ kind: z.literal('note'), title: z.string().min(1), text: z.string().min(1) }),
  z.object({
    kind: z.literal('compare'),
    title: z.string().min(1),
    rows: z.array(z.object({ term: z.string().min(1), meaning: z.string().min(1) })).min(2),
  }),
  z.object({ kind: z.literal('check'), questionId: slug }),
])

export const lessonSchema = z.object({
  id: slug,
  title: z.string().min(1),
  /** One sentence on what the learner will be able to do afterwards. */
  outcome: z.string().min(20),
  estimatedMinutes: z.number().int().min(1).max(45),
  beats: z.array(lessonBeatSchema).min(3),
  /** Questions used for the post-lesson battle. */
  questionIds: z.array(slug).min(1),
  tags: curriculumTags,
  sources: z.array(sourceRef).default([]),
  ...reviewable,
})

// ---------------------------------------------------------------------------
// Labs
// ---------------------------------------------------------------------------

/** A node in the simulated filesystem. No real FS is ever touched. */
export const fsNodeSchema: z.ZodType<FsNode> = z.lazy(() =>
  z.object({
    name: z.string().min(1),
    type: z.enum(['dir', 'file']),
    mode: z.string().regex(/^[0-7]{3,4}$/).optional(),
    owner: z.string().min(1).optional(),
    group: z.string().min(1).optional(),
    content: z.string().optional(),
    children: z.array(fsNodeSchema).optional(),
  }),
)

export type FsNode = {
  name: string
  type: 'dir' | 'file'
  mode?: string
  owner?: string
  group?: string
  content?: string
  children?: FsNode[]
}

const labBase = {
  id: slug,
  title: z.string().min(1),
  /** The in-world framing. */
  brief: z.string().min(30),
  /** Non-negotiable: every lab restates that it is a simulation. */
  sandboxNotice: z.string().min(20),
  objectiveText: z.string().min(10),
  hints: z.array(z.string().min(1)).default([]),
  debrief: z.string().min(40),
  xp: z.number().int().min(1).max(500),
  tags: curriculumTags,
  sources: z.array(sourceRef).default([]),
  ...reviewable,
}

export const labSchema = z.discriminatedUnion('engine', [
  z.object({
    ...labBase,
    engine: z.literal('terminal'),
    host: z.object({
      hostname: z.string().min(1),
      user: z.string().min(1),
      cwd: z.string().min(1),
      filesystem: fsNodeSchema,
      /** Simulated hosts reachable by the in-sim scanner. All RFC5737/RFC1918. */
      network: z
        .array(
          z.object({
            ip: z.string().min(1),
            hostname: z.string().min(1).optional(),
            ports: z.array(
              z.object({
                port: z.number().int().min(1).max(65535),
                proto: z.enum(['tcp', 'udp']),
                state: z.enum(['open', 'closed', 'filtered']),
                service: z.string().min(1),
                version: z.string().optional(),
              }),
            ),
          }),
        )
        .default([]),
    }),
    /** Win condition: these commands/outputs must have been reached. */
    goals: z
      .array(
        z.object({
          id: slug,
          description: z.string().min(1),
          /** Matched against normalised command text. */
          whenCommandMatches: z.string().min(1),
        }),
      )
      .min(1),
  }),
  z.object({
    ...labBase,
    engine: z.literal('logs'),
    columns: z.array(z.string().min(1)).min(3),
    rows: z
      .array(
        z.object({
          id: slug,
          cells: z.record(z.string(), z.string()),
          /** Rows that together evidence the attack. */
          malicious: z.boolean().default(false),
        }),
      )
      .min(5),
    question: questionSchema,
  }),
  z.object({
    ...labBase,
    engine: z.literal('phishing'),
    emails: z
      .array(
        z.object({
          id: slug,
          from: z.string().min(1),
          replyTo: z.string().optional(),
          subject: z.string().min(1),
          headers: z.array(z.object({ name: z.string().min(1), value: z.string().min(1) })).min(1),
          body: z.string().min(1),
          links: z
            .array(z.object({ text: z.string().min(1), href: z.string().min(1) }))
            .default([]),
          attachments: z
            .array(z.object({ filename: z.string().min(1), size: z.string().min(1) }))
            .default([]),
          verdict: z.enum(['phish', 'legitimate']),
          /** The specific signals a learner should have spotted. */
          tells: z.array(z.string().min(1)).min(1),
        }),
      )
      .min(2),
  }),
])

// ---------------------------------------------------------------------------
// Zones and glossary
// ---------------------------------------------------------------------------

export const zoneSchema = z.object({
  id: slug,
  /** Village name, e.g. "Hakumura". */
  name: z.string().min(1),
  /** Epithet, e.g. "The Village Hidden in First Light". */
  epithet: z.string().min(1),
  order: z.number().int().min(1),
  summary: z.string().min(30),
  /** Which Security+ domain and CSF Functions this village teaches. */
  domainId: z.string().regex(/^SP\.\d+$/),
  csf: z.array(csfRefId).min(1),
  palette: z.object({
    ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    paper: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  }),
  /** Ordered progression through the village. */
  nodes: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('lesson'), ref: slug }),
        z.object({ type: z.literal('lab'), ref: slug }),
        z.object({ type: z.literal('boss'), ref: slug }),
      ]),
    )
    .min(1),
  creatureIds: z.array(slug).default([]),
  ...reviewable,
})

export const glossarySchema = z.object({
  id: slug,
  term: z.string().min(1),
  short: z.string().min(10),
  long: z.string().min(40),
  aliases: z.array(z.string().min(1)).default([]),
  tags: curriculumTags,
  sources: z.array(sourceRef).default([]),
  ...reviewable,
})

export const bossSchema = z.object({
  id: slug,
  name: z.string().min(1),
  intro: z.string().min(20),
  creatureId: slug,
  /** Boss fights combine a village's skills; drawn from several lessons. */
  questionIds: z.array(slug).min(3),
  xp: z.number().int().min(1).max(1000),
  tags: curriculumTags,
  ...reviewable,
})

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type SecurityPlusFramework = z.infer<typeof securityPlusFrameworkSchema>
export type CsfFramework = z.infer<typeof csfFrameworkSchema>
export type Creature = z.infer<typeof creatureSchema>
export type Question = z.infer<typeof questionSchema>
export type Lesson = z.infer<typeof lessonSchema>
export type LessonBeat = z.infer<typeof lessonBeatSchema>
export type Lab = z.infer<typeof labSchema>
export type TerminalLab = Extract<Lab, { engine: 'terminal' }>
export type LogsLab = Extract<Lab, { engine: 'logs' }>
export type PhishingLab = Extract<Lab, { engine: 'phishing' }>
export type Zone = z.infer<typeof zoneSchema>
export type GlossaryEntry = z.infer<typeof glossarySchema>
export type Boss = z.infer<typeof bossSchema>
export type Sprite = z.infer<typeof spriteSchema>
