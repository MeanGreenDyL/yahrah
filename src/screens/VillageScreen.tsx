import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Button } from '@/ui/Button'
import { Menu } from '@/ui/Menu'
import { Meter } from '@/ui/Meter'
import { ZONES, LESSON_BY_ID, LAB_BY_ID, BOSS_BY_ID } from '@/content'

/**
 * A village is an ordered run of lessons, labs and a boss. Nodes unlock in
 * order so the curriculum is met in the sequence it was written in.
 */
export function VillageScreen() {
  const { save, go, openLesson, openLab, beginBossBattle } = useGame()
  const zone = ZONES[0]

  const isDone = (type: string, ref: string) =>
    type === 'lesson'
      ? save.progress.lessonsCompleted.includes(ref)
      : type === 'lab'
        ? save.progress.labsCompleted.includes(ref)
        : save.progress.bossesDefeated.includes(ref)

  const firstUnfinished = zone.nodes.findIndex((n) => !isDone(n.type, n.ref))
  const completed = zone.nodes.filter((n) => isDone(n.type, n.ref)).length

  const labelFor = (node: (typeof zone.nodes)[number]) => {
    if (node.type === 'lesson') return LESSON_BY_ID.get(node.ref)?.title ?? node.ref
    if (node.type === 'lab') return LAB_BY_ID.get(node.ref)?.title ?? node.ref
    return BOSS_BY_ID.get(node.ref)?.name ?? node.ref
  }

  const hintFor = (node: (typeof zone.nodes)[number], index: number) => {
    const done = isDone(node.type, node.ref)
    if (done) return 'Complete'
    if (firstUnfinished !== -1 && index > firstUnfinished) return 'Locked'
    if (node.type === 'lesson') {
      const l = LESSON_BY_ID.get(node.ref)
      return l ? `Lesson · ${l.estimatedMinutes} min` : 'Lesson'
    }
    if (node.type === 'lab') return 'Hands-on lab'
    return 'Boss'
  }

  return (
    <div className="screen">
      <header className="overworld-head">
        <div>
          <h1 className="screen-title">{zone.name}</h1>
          <p className="subtitle">{zone.epithet}</p>
        </div>
        <Button variant="ghost" onClick={() => go('overworld')}>
          Leave
        </Button>
      </header>

      <Panel id="zone-summary">
        <p>{zone.summary}</p>
        <Meter
          label="Village progress"
          value={completed}
          max={zone.nodes.length}
          tone="mastery"
          segments={zone.nodes.length}
        />
      </Panel>

      <Menu
        label={`${zone.name} path`}
        items={zone.nodes.map((node, i) => ({
          id: `${node.type}:${node.ref}`,
          label: labelFor(node),
          hint: hintFor(node, i),
          disabled: firstUnfinished !== -1 && i > firstUnfinished,
        }))}
        onSelect={(id) => {
          const [type, ref] = id.split(':')
          if (type === 'lesson') openLesson(ref)
          else if (type === 'lab') openLab(ref)
          else beginBossBattle(ref)
        }}
      />

      {completed === zone.nodes.length && (
        <Panel id="zone-done" tone="good" title="Hakumura stands">
          <p>
            The gatehouse is sound, the ledger is sealed, and Hollowgate is back in the Weave.
            Sagae has nothing further to teach you here.
          </p>
          <p className="footnote">The other six villages open in later chapters.</p>
        </Panel>
      )}
    </div>
  )
}
