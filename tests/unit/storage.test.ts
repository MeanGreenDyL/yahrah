import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { save, load, loadOrCreate, clear, activeBackend, resetForTests } from '@/engine/storage'
import { newSave, exportSave, importSave } from '@/engine/save'

describe('storage', () => {
  beforeEach(async () => {
    resetForTests()
    await clear()
  })

  it('uses IndexedDB when it is available', async () => {
    expect(await activeBackend()).toBe('indexeddb')
  })

  it('reports empty before anything is stored', async () => {
    const result = await load()
    expect(result.status).toBe('empty')
  })

  it('round-trips a save through IndexedDB', async () => {
    const original = newSave()
    original.profile.name = 'Tatenushi'
    original.profile.xp = 999
    original.progress.creaturesCaught = ['kagemono-phish-lure']

    await save(original)
    const result = await load()

    expect(result.status).toBe('loaded')
    if (result.status !== 'loaded') return
    expect(result.save.profile.name).toBe('Tatenushi')
    expect(result.save.profile.xp).toBe(999)
    expect(result.save.progress.creaturesCaught).toEqual(['kagemono-phish-lure'])
  })

  it('stamps updatedAt on write', async () => {
    const original = newSave(new Date('2020-01-01T00:00:00Z'))
    expect(original.updatedAt).toBe('2020-01-01T00:00:00.000Z')
    await save(original)
    const result = await load()
    if (result.status !== 'loaded') throw new Error('expected a loaded save')
    expect(result.save.updatedAt).not.toBe('2020-01-01T00:00:00.000Z')
  })

  it('creates and persists a fresh save when storage is empty', async () => {
    const { save: created, result } = await loadOrCreate()
    expect(result.status).toBe('empty')
    expect(created.profile.level).toBe(1)

    // The fresh save was persisted, so a second call loads rather than creates.
    const second = await loadOrCreate()
    expect(second.result.status).toBe('loaded')
  })

  it('reports corruption instead of throwing or wiping', async () => {
    await save(newSave())
    // Corrupt the stored record directly.
    const { openDB } = await import('idb')
    const db = await openDB('yahrah', 1)
    await db.put('save', '{"version":1,"profile":', 'current')

    const result = await load()
    expect(result.status).toBe('corrupt')
    if (result.status !== 'corrupt') return
    expect(result.reason).toMatch(/JSON|validation/i)
  })

  it('refuses a stored save from a newer build', async () => {
    const { openDB } = await import('idb')
    const db = await openDB('yahrah', 1)
    await db.put('save', JSON.stringify({ ...newSave(), version: 99 }), 'current')

    const result = await load()
    expect(result.status).toBe('corrupt')
    if (result.status !== 'corrupt') return
    expect(result.reason).toMatch(/newer than this build/)
  })

  it('clear() removes the save', async () => {
    await save(newSave())
    expect((await load()).status).toBe('loaded')
    await clear()
    expect((await load()).status).toBe('empty')
  })

  it('export -> wipe -> import restores the player exactly', async () => {
    const original = newSave()
    original.profile.name = 'Orinushi'
    original.profile.level = 42
    original.profile.xp = 98765
    original.profile.clanId = 'fujizome'
    original.profile.vowsAccepted = true
    original.streak = { current: 12, longest: 30, lastPlayedDay: '2026-10-20' }
    original.progress.badges = ['first-light', 'clean-sweep']
    original.mastery['SP.4.8'] = { seen: 20, correct: 17 }
    await save(original)

    const exported = exportSave(original)

    await clear()
    expect((await load()).status).toBe('empty')

    const reimported = importSave(exported)
    await save(reimported)

    const result = await load()
    if (result.status !== 'loaded') throw new Error('expected a loaded save')
    // updatedAt is restamped on write; everything else must survive untouched.
    const { updatedAt: _a, ...restored } = result.save
    const { updatedAt: _b, ...expected } = original
    expect(restored).toEqual(expected)
  })
})
