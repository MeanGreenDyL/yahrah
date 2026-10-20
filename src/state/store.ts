import { create } from 'zustand'
import { chiptune, type Sfx } from '@/audio/chiptune'
import {
  advance as advanceBattleState,
  answer as answerBattleState,
  currentQuestionId,
  startBattle,
  type BattleState,
  type Element,
  type Foe,
} from '@/engine/battle'
import { review } from '@/engine/srs'
import { recordAnswer } from '@/engine/mastery'
import { awardXp } from '@/engine/progression'
import { QUESTION_BY_ID, QUESTIONS, KAGEMONO, refsFor } from '@/content'
import { buildSession } from '@/engine/srs'
import {
  importSave,
  newSave,
  touchStreak,
  today,
  type Save,
  type Settings,
} from '@/engine/save'
import * as storage from '@/engine/storage'
import { syncBadges } from '@/engine/badges'

export type Screen =
  | 'title'
  | 'vows'
  | 'home'
  | 'settings'
  | 'codex'
  | 'overworld'
  | 'dashboard'
  | 'battle'

export type BootStatus = 'booting' | 'ready' | 'corrupt'

type State = {
  save: Save
  screen: Screen
  boot: BootStatus
  /** Set when a stored save could not be read, so the UI can offer a choice. */
  corruptReason: string | null
  backend: storage.Backend
  ready: boolean
  battle: BattleState | null

  init: () => Promise<void>
  beginBattle: (foe: Foe, questionIds: string[], element: Element) => void
  beginDailySession: (size?: number) => boolean
  answerBattle: (correct: boolean, usedHint?: boolean) => void
  advanceBattle: () => void
  leaveBattle: () => void
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
  battle: null,

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

  beginBattle(foe, questionIds, element) {
    set({ battle: startBattle(foe, questionIds, element), screen: 'battle' })
  },

  /**
   * The five-minute daily loop: whatever is due for review, topped up with
   * questions never seen. Returns false when there is genuinely nothing to
   * study, so the UI can say so rather than opening an empty battle.
   */
  beginDailySession(size = 5) {
    const save = get().save
    const queue = buildSession(
      save.srs,
      QUESTIONS.map((q) => q.id),
      today(),
      size,
    )
    if (queue.length === 0) return false

    // Pick the foe deterministically from the day, so a session is stable
    // if the player reloads mid-encounter.
    const index = Math.abs(hashString(today())) % Math.max(1, KAGEMONO.length)
    const creature = KAGEMONO[index]
    const foe: Foe = {
      creatureId: creature.id,
      name: creature.name,
      element: creature.element,
      maxHp: 40 + queue.length * 18,
    }

    // The equipped Mamori decides the player's element. Loadouts arrive with
    // the party screen; for now the first ward stands in.
    const element: Element = 'signal'

    set({ battle: startBattle(foe, queue, element), screen: 'battle' })
    return true
  },

  /**
   * Resolve an answer. One place updates the battle, the scheduler, mastery
   * and XP together, so they can never disagree about what happened.
   */
  answerBattle(correct, usedHint = false) {
    const state = get()
    const battle = state.battle
    if (!battle) return

    const questionId = currentQuestionId(battle)
    if (questionId === null) return
    const question = QUESTION_BY_ID.get(questionId)
    if (!question) return

    const nextBattle = answerBattleState(battle, correct, question.explanation, usedHint)
    const outcome = nextBattle.last
    if (!outcome) return

    const day = today()
    const save = state.save

    const next: Save = {
      ...save,
      mastery: recordAnswer(save.mastery, refsFor(questionId), correct),
      srs: { ...save.srs, [questionId]: review(save.srs[questionId], outcome.grade, day) },
    }

    get().sfx(correct ? 'hit' : 'hurt')
    set({ battle: nextBattle, save: next })
    schedulePersist(next)
  },

  advanceBattle() {
    const battle = get().battle
    if (!battle) return

    const nextBattle = advanceBattleState(battle)
    const justEnded =
      battle.phase === 'feedback' && (nextBattle.phase === 'won' || nextBattle.phase === 'lost')

    if (!justEnded) {
      set({ battle: nextBattle })
      return
    }

    // Award the battle's XP once, at the moment it resolves.
    const save = get().save
    const award = awardXp(save.profile.xp, nextBattle.xpEarned)
    const withXp: Save = {
      ...save,
      profile: { ...save.profile, xp: award.xp, level: award.level },
    }
    const { save: synced } = syncBadges(withXp)

    get().sfx(nextBattle.phase === 'won' ? 'levelup' : 'cancel')
    set({ battle: nextBattle, save: synced })
    schedulePersist(synced)
  },

  leaveBattle() {
    set({ battle: null, screen: 'home' })
  },
}))

/** Small stable string hash, so the daily foe does not change on reload. */
function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return hash
}

/** Push settings into the document so CSS can act on them. */
export function applySettings(settings: Settings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.style.setProperty('--text-scale', String(settings.textScale))
  root.dataset.motion = settings.motion
}
