import { describe, it, expect } from 'vitest'
import { BADGES, earnedBadges, syncBadges } from '@/engine/badges'
import { newSave } from '@/engine/save'
import { OBJECTIVES } from '@/content'

describe('badges', () => {
  it('awards nothing on a fresh save', () => {
    expect(earnedBadges(newSave())).toEqual([])
  })

  it('has unique ids and non-empty copy', () => {
    const ids = BADGES.map((b) => b.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const badge of BADGES) {
      expect(badge.name.length).toBeGreaterThan(0)
      expect(badge.description.length).toBeGreaterThan(0)
      expect(badge.hint.length).toBeGreaterThan(0)
    }
  })

  it('awards First Light for taking the vows', () => {
    const save = newSave()
    save.profile.vowsAccepted = true
    expect(earnedBadges(save).map((b) => b.id)).toContain('first-light')
  })

  it('awards streak badges at the right thresholds', () => {
    const save = newSave()
    save.streak.longest = 2
    expect(earnedBadges(save).map((b) => b.id)).not.toContain('steady-hand')
    save.streak.longest = 3
    expect(earnedBadges(save).map((b) => b.id)).toContain('steady-hand')
    expect(earnedBadges(save).map((b) => b.id)).not.toContain('weeklong-watch')
    save.streak.longest = 7
    expect(earnedBadges(save).map((b) => b.id)).toContain('weeklong-watch')
  })

  it('awards Cartographer at a quarter of the syllabus', () => {
    const save = newSave()
    const quarter = Math.ceil(OBJECTIVES.length * 0.25)
    for (const o of OBJECTIVES.slice(0, quarter)) {
      save.mastery[o.id] = { seen: 1, correct: 1 }
    }
    expect(earnedBadges(save).map((b) => b.id)).toContain('cartographer')
  })

  it('is idempotent: recomputing changes nothing', () => {
    const save = newSave()
    save.profile.vowsAccepted = true
    const first = syncBadges(save)
    expect(first.newly.map((b) => b.id)).toEqual(['first-light'])
    const second = syncBadges(first.save)
    expect(second.newly).toEqual([])
    expect(second.save).toBe(first.save)
  })

  it('reports only badges not already stored as newly earned', () => {
    const save = newSave()
    save.profile.vowsAccepted = true
    save.progress.badges = ['first-light']
    expect(syncBadges(save).newly).toEqual([])
  })

  it('stores earned ids on the save', () => {
    const save = newSave()
    save.profile.vowsAccepted = true
    save.streak.longest = 7
    const { save: synced } = syncBadges(save)
    expect(synced.progress.badges).toContain('first-light')
    expect(synced.progress.badges).toContain('steady-hand')
    expect(synced.progress.badges).toContain('weeklong-watch')
  })

  it('does not mutate the save it is given', () => {
    const save = newSave()
    save.profile.vowsAccepted = true
    syncBadges(save)
    expect(save.progress.badges).toEqual([])
  })
})
