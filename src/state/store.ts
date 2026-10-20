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
import {
  BOSS_BY_ID,
  CREATURE_BY_ID,
  LAB_BY_ID,
  LESSON_BY_ID,
  QUESTION_BY_ID,
  QUESTIONS,
  KAGEMONO,
  refsFor,
} from '@/content'
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
  | 'lab'
  | 'lesson'
  | 'village'

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
  activeLabId: string | null
  activeLessonId: string | null
  activeBossId: string | null

  init: () => Promise<void>
  beginBattle: (foe: Foe, questionIds: string[], element: Element) => void
  beginDailySession: (size?: number) => boolean
  openLab: (labId: string) => void
  finishLab: (labId: string) => void
  openLesson: (lessonId: string) => void
  finishLesson: (lessonId: string) => void
  answerLessonCheck: (questionId: string, correct: boolean) => void
  beginBossBattle: (bossId: string) => void
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
  activeLabId: null,
  activeLessonId: null,
  activeBossId: null,

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
    // A boss win is recorded on the save, once.
    const bossId = get().activeBossId
    let progressed = withXp
    if (bossId && nextBattle.phase === 'won' && !withXp.progress.bossesDefeated.includes(bossId)) {
      const boss = BOSS_BY_ID.get(bossId)
      const bossAward = awardXp(withXp.profile.xp, boss?.xp ?? 0)
      progressed = {
        ...withXp,
        profile: { ...withXp.profile, xp: bossAward.xp, level: bossAward.level },
        progress: {
          ...withXp.progress,
          bossesDefeated: [...withXp.progress.bossesDefeated, bossId],
          creaturesCaught: withXp.progress.creaturesCaught.includes(nextBattle.foe.creatureId)
            ? withXp.progress.creaturesCaught
            : [...withXp.progress.creaturesCaught, nextBattle.foe.creatureId],
        },
      }
    }
    const { save: synced } = syncBadges(progressed)

    get().sfx(nextBattle.phase === 'won' ? 'levelup' : 'cancel')
    set({ battle: nextBattle, save: synced })
    schedulePersist(synced)
  },

  leaveBattle() {
    // A boss fight belongs to a village, so return there rather than home.
    const wasBoss = get().activeBossId !== null
    set({ battle: null, activeBossId: null, screen: wasBoss ? 'village' : 'home' })
  },

  openLab(labId) {
    if (!LAB_BY_ID.has(labId)) return
    set({ activeLabId: labId, screen: 'lab' })
  },

  openLesson(lessonId) {
    if (!LESSON_BY_ID.has(lessonId)) return
    set({ activeLessonId: lessonId, screen: 'lesson' })
  },

  /** A check inside a lesson updates mastery and the scheduler, like a battle. */
  answerLessonCheck(questionId, correct) {
    const save = get().save
    if (!QUESTION_BY_ID.has(questionId)) return
    const next: Save = {
      ...save,
      mastery: recordAnswer(save.mastery, refsFor(questionId), correct),
      srs: {
        ...save.srs,
        [questionId]: review(save.srs[questionId], correct ? 'good' : 'again', today()),
      },
    }
    get().sfx(correct ? 'hit' : 'hurt')
    set({ save: next })
    schedulePersist(next)
  },

  finishLesson(lessonId) {
    const lesson = LESSON_BY_ID.get(lessonId)
    const save = get().save
    if (!lesson || save.progress.lessonsCompleted.includes(lessonId)) {
      set({ activeLessonId: null, screen: 'village' })
      return
    }
    const award = awardXp(save.profile.xp, 60)
    const withProgress: Save = {
      ...save,
      profile: { ...save.profile, xp: award.xp, level: award.level },
      progress: {
        ...save.progress,
        lessonsCompleted: [...save.progress.lessonsCompleted, lessonId],
      },
    }
    const { save: synced } = syncBadges(withProgress)
    get().sfx('levelup')
    set({ save: synced, activeLessonId: null, screen: 'village' })
    schedulePersist(synced)
  },

  beginBossBattle(bossId) {
    const boss = BOSS_BY_ID.get(bossId)
    if (!boss) return
    const creature = CREATURE_BY_ID.get(boss.creatureId)
    if (!creature) return
    const foe: Foe = {
      creatureId: creature.id,
      name: boss.name,
      element: creature.element,
      maxHp: 60 + boss.questionIds.length * 22,
    }
    set({
      activeBossId: bossId,
      battle: startBattle(foe, boss.questionIds, 'signal'),
      screen: 'battle',
    })
  },

  /** Record a completed lab once, award its XP, and return home. */
  finishLab(labId) {
    const lab = LAB_BY_ID.get(labId)
    const save = get().save
    if (!lab || save.progress.labsCompleted.includes(labId)) {
      set({ activeLabId: null, screen: 'home' })
      return
    }

    const award = awardXp(save.profile.xp, lab.xp)
    const withProgress: Save = {
      ...save,
      profile: { ...save.profile, xp: award.xp, level: award.level },
      progress: { ...save.progress, labsCompleted: [...save.progress.labsCompleted, labId] },
      mastery: recordAnswer(
        save.mastery,
        [...lab.tags.objectives, ...lab.tags.csf],
        true,
      ),
    }
    const { save: synced } = syncBadges(withProgress)

    get().sfx('levelup')
    set({ save: synced, activeLabId: null, screen: 'village' })
    schedulePersist(synced)
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
