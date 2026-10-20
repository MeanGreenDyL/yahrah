/**
 * Content validator. Run with `npm run validate-content`.
 *
 * Fails the build on:
 *   - any schema violation
 *   - any reference to a Security+ objective or CSF id that does not exist
 *   - any cross-reference to a missing lesson / question / lab / creature / boss
 *   - duplicate ids within a collection
 *   - a question without an explanation, or whose answer is not among its choices
 *
 * Also reports curriculum coverage and how many items are flagged needs_review,
 * so the gap between "written" and "verified" stays visible.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { z } from 'zod'
import {
  securityPlusFrameworkSchema,
  csfFrameworkSchema,
  creatureSchema,
  questionSchema,
  lessonSchema,
  labSchema,
  zoneSchema,
  glossarySchema,
  bossSchema,
} from '../src/content/schemas.ts'

const ROOT = join(import.meta.dirname, '..')
/** Overridable so tests can point the validator at fixture trees. */
const CONTENT = process.env.YAHRAH_CONTENT_DIR
  ? resolve(process.env.YAHRAH_CONTENT_DIR)
  : join(ROOT, 'content')

type Problem = { file: string; path: string; message: string }
const problems: Problem[] = []
const notes: string[] = []

function displayPath(file: string): string {
  const rel = relative(ROOT, file)
  return rel.startsWith('..') ? file : rel
}

function fail(file: string, path: string, message: string) {
  problems.push({ file: displayPath(file), path, message })
}

function readJson(file: string): unknown {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    fail(file, '<file>', `invalid JSON: ${(err as Error).message}`)
    return null
  }
}

function jsonFilesIn(dir: string): string[] {
  const full = join(CONTENT, dir)
  if (!existsSync(full)) return []
  return readdirSync(full)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(full, f))
}

/** Parse every .json in a content dir against a schema, collecting issues. */
function loadAll<T extends z.ZodTypeAny>(dir: string, schema: T): { file: string; data: z.infer<T> }[] {
  const out: { file: string; data: z.infer<T> }[] = []
  for (const file of jsonFilesIn(dir)) {
    const raw = readJson(file)
    if (raw === null) continue
    // A file may hold a single object or an array of them.
    const items = Array.isArray(raw) ? raw : [raw]
    items.forEach((item, i) => {
      const result = schema.safeParse(item)
      if (!result.success) {
        for (const issue of result.error.issues) {
          const where = Array.isArray(raw) ? `[${i}].${issue.path.join('.')}` : issue.path.join('.') || '<root>'
          fail(file, where, issue.message)
        }
        return
      }
      out.push({ file, data: result.data })
    })
  }
  return out
}

// ---------------------------------------------------------------------------
// 1. Objective spine - everything else validates against this
// ---------------------------------------------------------------------------

const spFile = join(CONTENT, 'objectives/securityplus-sy0-701.json')
const csfFile = join(CONTENT, 'objectives/nist-csf-2.0.json')

const spRaw = readJson(spFile)
const csfRaw = readJson(csfFile)

const spParsed = securityPlusFrameworkSchema.safeParse(spRaw)
if (!spParsed.success) {
  for (const issue of spParsed.error.issues) fail(spFile, issue.path.join('.'), issue.message)
}
const csfParsed = csfFrameworkSchema.safeParse(csfRaw)
if (!csfParsed.success) {
  for (const issue of csfParsed.error.issues) fail(csfFile, issue.path.join('.'), issue.message)
}

const validObjectives = new Set<string>()
const objectiveStatements = new Map<string, string>()
if (spParsed.success) {
  const weightTotal = spParsed.data.domains.reduce((a, d) => a + d.weight, 0)
  if (weightTotal !== 100) {
    fail(spFile, 'domains[].weight', `domain weights sum to ${weightTotal}%, expected 100%`)
  }
  for (const domain of spParsed.data.domains) {
    for (const obj of domain.objectives) {
      if (validObjectives.has(obj.id)) fail(spFile, obj.id, 'duplicate objective id')
      validObjectives.add(obj.id)
      objectiveStatements.set(obj.id, obj.statement)
      if (!obj.id.startsWith(`${domain.id}.`)) {
        fail(spFile, obj.id, `objective id does not belong to domain ${domain.id}`)
      }
    }
  }
}

const validCsf = new Set<string>()
if (csfParsed.success) {
  for (const fn of csfParsed.data.functions) {
    validCsf.add(fn.id)
    for (const cat of fn.categories) {
      if (validCsf.has(cat.id)) fail(csfFile, cat.id, 'duplicate category id')
      validCsf.add(cat.id)
      if (!cat.id.startsWith(`${fn.id}.`)) {
        fail(csfFile, cat.id, `category id does not belong to Function ${fn.id}`)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Load all content collections
// ---------------------------------------------------------------------------

const creatures = loadAll('creatures', creatureSchema)
const questions = loadAll('questions', questionSchema)
const lessons = loadAll('lessons', lessonSchema)
const labs = loadAll('labs', labSchema)
const zones = loadAll('zones', zoneSchema)
const glossary = loadAll('glossary', glossarySchema)
const bosses = loadAll('bosses', bossSchema)

// ---------------------------------------------------------------------------
// 3. Duplicate ids
// ---------------------------------------------------------------------------

function checkUniqueIds(label: string, items: { file: string; data: { id: string } }[]) {
  const seen = new Map<string, string>()
  for (const { file, data } of items) {
    const prior = seen.get(data.id)
    if (prior) {
      fail(file, data.id, `duplicate ${label} id (also defined in ${displayPath(prior)})`)
    } else {
      seen.set(data.id, file)
    }
  }
  return seen
}

const creatureIds = checkUniqueIds('creature', creatures)
const questionIds = checkUniqueIds('question', questions)
const lessonIds = checkUniqueIds('lesson', lessons)
const labIds = checkUniqueIds('lab', labs)
const bossIds = checkUniqueIds('boss', bosses)
checkUniqueIds('zone', zones)
checkUniqueIds('glossary entry', glossary)

// ---------------------------------------------------------------------------
// 4. Curriculum tagging - the core integrity rule
// ---------------------------------------------------------------------------

const objectiveUse = new Map<string, number>()
const csfUse = new Map<string, number>()

type Tagged = { tags: { objectives: string[]; csf: string[] }; id: string }

function checkTags(file: string, item: Tagged) {
  for (const id of item.tags.objectives) {
    if (!validObjectives.has(id)) {
      fail(file, `${item.id}.tags.objectives`, `unknown Security+ objective "${id}"`)
    } else {
      objectiveUse.set(id, (objectiveUse.get(id) ?? 0) + 1)
    }
  }
  for (const id of item.tags.csf) {
    if (!validCsf.has(id)) {
      fail(file, `${item.id}.tags.csf`, `unknown NIST CSF 2.0 reference "${id}"`)
    } else {
      csfUse.set(id, (csfUse.get(id) ?? 0) + 1)
    }
  }
}

for (const { file, data } of [...creatures, ...questions, ...lessons, ...labs, ...glossary, ...bosses]) {
  checkTags(file, data as unknown as Tagged)
}

// ---------------------------------------------------------------------------
// 5. Cross-references
// ---------------------------------------------------------------------------

for (const { file, data } of creatures) {
  if (!creatureIds.has(data.weakness)) {
    fail(file, `${data.id}.weakness`, `weakness references unknown creature "${data.weakness}"`)
  }
  if (data.weakness === data.id) {
    fail(file, `${data.id}.weakness`, 'a creature cannot be its own weakness')
  }
}

for (const { file, data } of questions) {
  if (data.type === 'single') {
    const ids = data.choices.map((c) => c.id)
    if (new Set(ids).size !== ids.length) fail(file, `${data.id}.choices`, 'duplicate choice ids')
    if (!ids.includes(data.answer)) {
      fail(file, `${data.id}.answer`, `answer "${data.answer}" is not one of the choices`)
    }
  }
  if (data.type === 'multi') {
    const ids = data.choices.map((c) => c.id)
    if (new Set(ids).size !== ids.length) fail(file, `${data.id}.choices`, 'duplicate choice ids')
    for (const a of data.answers) {
      if (!ids.includes(a)) fail(file, `${data.id}.answers`, `answer "${a}" is not one of the choices`)
    }
    if (data.answers.length === data.choices.length) {
      fail(file, `${data.id}.answers`, 'every choice is correct, which teaches nothing')
    }
  }
  if (data.type === 'order') {
    const ids = data.items.map((i) => i.id)
    if (new Set(ids).size !== ids.length) fail(file, `${data.id}.items`, 'duplicate item ids')
    if (data.answer.length !== ids.length) {
      fail(file, `${data.id}.answer`, `answer lists ${data.answer.length} items but there are ${ids.length}`)
    }
    for (const a of data.answer) {
      if (!ids.includes(a)) fail(file, `${data.id}.answer`, `answer references unknown item "${a}"`)
    }
  }
}

for (const { file, data } of lessons) {
  for (const qid of data.questionIds) {
    if (!questionIds.has(qid)) {
      fail(file, `${data.id}.questionIds`, `references unknown question "${qid}"`)
    }
  }
  for (const [i, beat] of data.beats.entries()) {
    if (beat.kind === 'check' && !questionIds.has(beat.questionId)) {
      fail(file, `${data.id}.beats[${i}]`, `check beat references unknown question "${beat.questionId}"`)
    }
  }
}

for (const { file, data } of bosses) {
  if (!creatureIds.has(data.creatureId)) {
    fail(file, `${data.id}.creatureId`, `references unknown creature "${data.creatureId}"`)
  }
  for (const qid of data.questionIds) {
    if (!questionIds.has(qid)) fail(file, `${data.id}.questionIds`, `references unknown question "${qid}"`)
  }
}

const spDomainIds = new Set(spParsed.success ? spParsed.data.domains.map((d) => d.id) : [])
for (const { file, data } of zones) {
  if (spDomainIds.size && !spDomainIds.has(data.domainId)) {
    fail(file, `${data.id}.domainId`, `unknown Security+ domain "${data.domainId}"`)
  }
  for (const id of data.csf) {
    if (!validCsf.has(id)) fail(file, `${data.id}.csf`, `unknown NIST CSF 2.0 reference "${id}"`)
  }
  for (const [i, node] of data.nodes.entries()) {
    const table = node.type === 'lesson' ? lessonIds : node.type === 'lab' ? labIds : bossIds
    if (!table.has(node.ref)) {
      fail(file, `${data.id}.nodes[${i}]`, `${node.type} node references unknown "${node.ref}"`)
    }
  }
  for (const cid of data.creatureIds) {
    if (!creatureIds.has(cid)) fail(file, `${data.id}.creatureIds`, `references unknown creature "${cid}"`)
  }
}

// ---------------------------------------------------------------------------
// 6. Safety guardrail: no real-world network targets in simulated labs
// ---------------------------------------------------------------------------

/** Documentation (RFC 5737) and private (RFC 1918) ranges only. */
function isSimulatedIp(ip: string): boolean {
  return (
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    /^192\.0\.2\./.test(ip) ||
    /^198\.51\.100\./.test(ip) ||
    /^203\.0\.113\./.test(ip) ||
    ip === '127.0.0.1'
  )
}

for (const { file, data } of labs) {
  if (data.engine === 'terminal') {
    for (const host of data.host.network) {
      if (!isSimulatedIp(host.ip)) {
        fail(
          file,
          `${data.id}.host.network`,
          `"${host.ip}" is not a documentation or private-range address; labs must never name real targets`,
        )
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Coverage + honesty report
// ---------------------------------------------------------------------------

const allItems = [...creatures, ...questions, ...lessons, ...labs, ...glossary, ...bosses, ...zones]
const flagged = allItems.filter((i) => (i.data as { needs_review?: boolean }).needs_review)

if (validObjectives.size) {
  const covered = [...validObjectives].filter((id) => objectiveUse.has(id))
  notes.push(
    `Security+ objectives covered: ${covered.length}/${validObjectives.size} ` +
      `(${Math.round((covered.length / validObjectives.size) * 100)}%)`,
  )
}
if (validCsf.size) {
  const categories = [...validCsf].filter((id) => id.includes('.'))
  const covered = categories.filter((id) => csfUse.has(id))
  notes.push(`CSF 2.0 categories touched: ${covered.length}/${categories.length}`)
}
notes.push(
  `Content items: ${lessons.length} lessons, ${questions.length} questions, ${labs.length} labs, ` +
    `${creatures.length} creatures, ${bosses.length} bosses, ${zones.length} zones, ${glossary.length} glossary`,
)
if (flagged.length) {
  notes.push(`Flagged needs_review: ${flagged.length} item(s) - ${flagged.map((f) => f.data.id).join(', ')}`)
}

// Framework spines themselves carry a verification status; surface it.
for (const [label, parsed] of [
  ['Security+', spParsed] as const,
  ['NIST CSF 2.0', csfParsed] as const,
]) {
  if (parsed.success && parsed.data.verification.status === 'unverified-primary-source') {
    notes.push(`${label} spine is NOT primary-source verified (${parsed.data.verification.checked_on})`)
  }
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log('\nYahrah content validation\n' + '='.repeat(52))
for (const note of notes) console.log(`  . ${note}`)

if (problems.length) {
  console.error(`\n${problems.length} problem(s) found:\n`)
  const byFile = new Map<string, Problem[]>()
  for (const p of problems) {
    if (!byFile.has(p.file)) byFile.set(p.file, [])
    byFile.get(p.file)!.push(p)
  }
  for (const [file, list] of byFile) {
    console.error(`  ${file}`)
    for (const p of list) console.error(`    ${p.path}: ${p.message}`)
  }
  console.error('')
  process.exit(1)
}

console.log('\n  All content valid.\n')
