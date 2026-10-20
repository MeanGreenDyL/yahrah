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

      {CURRICULUM_NEEDS_REVIEW ? (
        <Panel id="review" tone="warn" title="How this curriculum is sourced">
          <p className="footnote">
            Parts of this curriculum have not been checked against the official documents yet.
            Anything resting on them is flagged in the content. See <code>docs/research/</code>.
          </p>
        </Panel>
      ) : (
        <Panel id="review" tone="good" title="How this curriculum is sourced">
          <p className="footnote">
            Objectives read from CompTIA's official {SECURITY_PLUS.version} exam objectives
            document, version {SECURITY_PLUS.objectives_document_version}. All five domains,
            their weights and all{' '}
            {SECURITY_PLUS.domains.reduce((a, d) => a + d.objectives.length, 0)} objective
            statements match it word for word.
          </p>
          <p className="footnote">
            CSF {CSF.version} generated from NIST's own Cybersecurity and Privacy Reference Tool
            export: {CSF.functions.length} Functions,{' '}
            {CSF.functions.reduce((a, f) => a + f.categories.length, 0)} Categories and{' '}
            {CSF.functions.reduce(
              (a, f) => a + f.categories.reduce((b, c) => b + c.subcategories.length, 0),
              0,
            )}{' '}
            Subcategories, verbatim.
          </p>
        </Panel>
      )}

      <Button variant="ghost" full onClick={() => go('home')}>
        Back
      </Button>
    </div>
  )
}
