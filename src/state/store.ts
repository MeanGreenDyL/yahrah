import { create } from 'zustand'
import { chiptune, type Sfx } from '@/audio/chiptune'
import {
  newSave,
  touchStreak,
  today,
  type Save,
  type Settings,
} from '@/engine/save'
import * as storage from '@/engine/storage'
import { syncBadges } from '@/engine/badges'

export type Screen = 'title' | 'vows' | 'home' | 'settings' | 'codex' | 'overworld' | 'dashboard'

export type BootStatus = 'booting' | 'ready' | 'corrupt'

type State = {
  save: Save
  screen: Screen
  boot: BootStatus
  /** Set when a stored save could not be read, so the UI can offer a choice. */
  corruptReason: string | null
  backend: storage.Backend
  ready: boolean

  init: () => Promise<void>
  go: (screen: Screen) => void
  sfx: (name: Sfx) => void
  acceptVows: () => void
  setSettings: (patch: Partial<Settings>) => void
  markPlayedToday: () => void
  startFresh: () => Promise<void>
  importFrom: (text: string) => Promise<void>
  exportText: () => string
}

/** Writes are debounced so rapid UI changes do not thrash storage. */
let flushTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(save: Save) {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    void storage.save(save)
    flushTimer = null
  }, 250)
}

export const useGame = create<State>((set, get) => ({
  save: newSave(),
  screen: 'title',
  boot: 'booting',
  corruptReason: null,
  backend: 'memory',
  ready: false,

  async init() {
    const result = await storage.load()
    if (result.status === 'loaded') {
      applySettings(result.save.settings)
      set({
        save: result.save,
        backend: result.backend,
        boot: 'ready',
        ready: true,
        screen: result.save.profile.vowsAccepted ? 'home' : 'title',
      })
      return
    }
    if (result.status === 'corrupt') {
      // Do not overwrite: the player may want to recover the file by hand.
      set({
        boot: 'corrupt',
        corruptReason: result.reason,
        backend: result.backend,
        ready: true,
      })
      return
    }
    const fresh = newSave()
    await storage.save(fresh)
    applySettings(fresh.settings)
    set({ save: fresh, backend: result.backend, boot: 'ready', ready: true, screen: 'title' })
  },

  go(screen) {
    get().sfx('select')
    set({ screen })
  },

  sfx(name) {
    if (get().save.settings.audio) chiptune.play(name)
  },

  acceptVows() {
    const withVows = { ...get().save, profile: { ...get().save.profile, vowsAccepted: true } }
    const { save } = syncBadges(withVows)
    set({ save, screen: 'home' })
    schedulePersist(save)
  },

  setSettings(patch) {
    const settings = { ...get().save.settings, ...patch }
    const save = { ...get().save, settings }
    applySettings(settings)
    chiptune.setEnabled(settings.audio)
    set({ save })
    schedulePersist(save)
  },

  markPlayedToday() {
    const streaked = touchStreak(get().save, today())
    if (streaked === get().save) return
    const { save } = syncBadges(streaked)
    set({ save })
    schedulePersist(save)
  },

  async startFresh() {
    const fresh = newSave()
    await storage.clear()
    await storage.save(fresh)
    applySettings(fresh.settings)
    chiptune.setEnabled(fresh.settings.audio)
    set({ save: fresh, boot: 'ready', corruptReason: null, screen: 'title' })
  },

  async importFrom(text) {
    // Throws SaveMigrationError with a readable reason; the caller shows it.
    const { importSave } = await import('@/engine/save')
    const imported = importSave(text)
    await storage.save(imported)
    applySettings(imported.settings)
    chiptune.setEnabled(imported.settings.audio)
    set({
      save: imported,
      boot: 'ready',
      corruptReason: null,
      screen: imported.profile.vowsAccepted ? 'home' : 'title',
    })
  },

  exportText() {
    return JSON.stringify(get().save, null, 2)
  },
}))

/** Push settings into the document so CSS can act on them. */
export function applySettings(settings: Settings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--text-scale', String(settings.textScale))
  root.dataset.motion = settings.motion
}
