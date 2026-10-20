import { openDB, type IDBPDatabase } from 'idb'
import { migrate, newSave, type Save } from './save'

/**
 * Persistence. IndexedDB is the primary store; localStorage is a genuine
 * fallback for private-browsing modes and locked-down WebViews where IDB
 * throws or is absent.
 *
 * Every read path tolerates corruption: a save that will not parse is
 * reported, not thrown away silently, and the caller decides.
 */

const DB_NAME = 'yahrah'
const DB_VERSION = 1
const STORE = 'save'
const KEY = 'current'
const LS_KEY = 'yahrah:save'

export type Backend = 'indexeddb' | 'localstorage' | 'memory'

export type LoadResult =
  | { status: 'loaded'; save: Save; backend: Backend }
  | { status: 'empty'; backend: Backend }
  | { status: 'corrupt'; reason: string; backend: Backend }

let dbPromise: Promise<IDBPDatabase> | null = null
/** Last-resort store so the game still runs when all persistence is blocked. */
let memory: string | null = null

function hasIndexedDb(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

function hasLocalStorage(): boolean {
  try {
    const probe = '__yahrah_probe__'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

async function getDb(): Promise<IDBPDatabase | null> {
  if (!hasIndexedDb()) return null
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      },
    })
  }
  try {
    return await dbPromise
  } catch {
    // Private mode and some WebViews reject openDB outright.
    dbPromise = null
    return null
  }
}

/** Which backend this environment will actually use. */
export async function activeBackend(): Promise<Backend> {
  if (await getDb()) return 'indexeddb'
  if (hasLocalStorage()) return 'localstorage'
  return 'memory'
}

export async function save(data: Save): Promise<Backend> {
  const payload = JSON.stringify({ ...data, updatedAt: new Date().toISOString() })

  const db = await getDb()
  if (db) {
    try {
      await db.put(STORE, payload, KEY)
      return 'indexeddb'
    } catch {
      // Quota or transaction failure - fall through to localStorage.
    }
  }

  if (hasLocalStorage()) {
    try {
      localStorage.setItem(LS_KEY, payload)
      return 'localstorage'
    } catch {
      // Quota exceeded.
    }
  }

  memory = payload
  return 'memory'
}

export async function load(): Promise<LoadResult> {
  const backend = await activeBackend()

  let raw: string | null = null
  const db = await getDb()
  if (db) {
    try {
      raw = (await db.get(STORE, KEY)) ?? null
    } catch {
      raw = null
    }
  }
  if (raw === null && hasLocalStorage()) {
    try {
      raw = localStorage.getItem(LS_KEY)
    } catch {
      raw = null
    }
  }
  if (raw === null) raw = memory

  if (raw === null) return { status: 'empty', backend }

  try {
    return { status: 'loaded', save: migrate(JSON.parse(raw)), backend }
  } catch (err) {
    return { status: 'corrupt', reason: (err as Error).message, backend }
  }
}

/** Load, or create and persist a fresh save when there is nothing stored. */
export async function loadOrCreate(): Promise<{ save: Save; result: LoadResult }> {
  const result = await load()
  if (result.status === 'loaded') return { save: result.save, result }
  const fresh = newSave()
  await save(fresh)
  return { save: fresh, result }
}

export async function clear(): Promise<void> {
  const db = await getDb()
  if (db) {
    try {
      await db.delete(STORE, KEY)
    } catch {
      // ignore
    }
  }
  if (hasLocalStorage()) {
    try {
      localStorage.removeItem(LS_KEY)
    } catch {
      // ignore
    }
  }
  memory = null
}

/** Test seam: drop cached handles so a fresh environment is picked up. */
export function resetForTests(): void {
  dbPromise = null
  memory = null
}
