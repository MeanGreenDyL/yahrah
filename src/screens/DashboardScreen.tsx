import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Meter } from '@/ui/Meter'
import { Button } from '@/ui/Button'
import {
  domainScores,
  functionScores,
  examReadiness,
  weakAreas,
  coverage,
} from '@/engine/mastery'
import { SECURITY_PLUS, CSF, CURRICULUM_NEEDS_REVIEW } from '@/content'
import { BADGES } from '@/engine/badges'

function pct(ratio: number): number {
  return Math.round(ratio * 100)
}

export function DashboardScreen() {
  const { save, go } = useGame()
  const mastery = save.mastery

  const domains = domainScores(mastery)
  const functions = functionScores(mastery)
  const readiness = examReadiness(mastery)
  const weak = weakAreas(mastery, 5)
  const covered = coverage(mastery)

  return (
    <div className="screen">
      <h1 className="screen-title">Progress</h1>

      <Panel id="readiness" title="Exam readiness">
        <div className="readiness">
          <span className="readiness-score">{readiness}</span>
          <span className="readiness-of">/ 100</span>
        </div>
        <p className="footnote">
          How much of the {SECURITY_PLUS.version} syllabus you have demonstrated, weighted the way
          the exam weights each domain. It is a study aid, not a prediction.
        </p>
        <p className="footnote">
          Syllabus touched: {covered.touched} of {covered.total} objectives ({pct(covered.ratio)}%).
        </p>
      </Panel>

      <Panel id="domains" title="By Security+ domain">
        <ul className="plain-list">
          {domains.map((domain) => (
            <li key={domain.id}>
              <Meter
                label={`${domain.name} (${domain.weight}%)`}
                value={pct(domain.mastery)}
                max={100}
                tone="mastery"
                segments={16}
              />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="functions" title={`By NIST CSF ${CSF.version} Function`}>
        <ul className="plain-list">
          {functions.map((fn) => (
            <li key={fn.id}>
              <Meter
                label={`${fn.id} · ${fn.name}`}
                value={pct(fn.mastery)}
                max={100}
                tone="mastery"
                segments={16}
              />
            </li>
          ))}
        </ul>
      </Panel>

      <Panel id="weak" title="Worth studying next">
        {weak.length === 0 ? (
          <p className="footnote">
            Nothing yet — answer some questions and your weakest objectives will surface here.
          </p>
        ) : (
          <ul className="plain-list">
            {weak.map((item) => (
              <li key={item.id}>
                <strong>{item.id}</strong> — {item.name}
                <span className="menu-hint">
                  {item.correct} of {item.seen} correct · {pct(item.mastery)}% mastery
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel id="badges" title="Badges">
        <ul className="badges">
          {BADGES.map((badge) => {
            const earned = badge.earned(save)
            return (
              <li key={badge.id} className={earned ? 'badge-row badge-earned' : 'badge-row'}>
                <span className="badge-mark" aria-hidden="true">
                  {earned ? '\u2605' : '\u2606'}
                </span>
                <span>
                  <strong>{badge.name}</strong>
                  <span className="menu-hint">
                    {earned ? badge.description : badge.hint}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </Panel>

      {CURRICULUM_NEEDS_REVIEW && (
        <Panel id="review" tone="warn">
          <p className="footnote">
            The curriculum spine has not yet been checked against CompTIA's and NIST's own
            published documents. Objective wording and category titles may shift once it is. See
            <code> docs/research/</code>.
          </p>
        </Panel>
      )}

      <Button variant="ghost" full onClick={() => go('home')}>
        Back
      </Button>
    </div>
  )
}
