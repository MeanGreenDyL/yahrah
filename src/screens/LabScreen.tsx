import { useEffect, useRef, useState } from 'react'
import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Button } from '@/ui/Button'
import { DialogBox } from '@/ui/DialogBox'
import { LAB_BY_ID } from '@/content'
import { shuffleSeeded } from '@/engine/shuffle'
import type { Lab, LogsLab, PhishingLab, TerminalLab } from '@/content/schemas'
import {
  isComplete,
  runCommand,
  startTerminal,
  type TerminalState,
} from '@/labs/terminal'
import {
  scoreLogs,
  setFilter,
  setSort,
  startLogs,
  toggleFlag,
  visibleRows,
  type LogsState,
} from '@/labs/logs'
import {
  currentEmail,
  isFinished,
  judge,
  nextEmail,
  scorePhishing,
  startPhishing,
  toggleHeaders,
  type PhishingState,
} from '@/labs/phishing'

/** Shared chrome: brief, sandbox notice and progressive hints. */
function LabFrame({
  lab,
  children,
  onFinish,
  finishLabel,
  canFinish,
}: {
  lab: Lab
  children: React.ReactNode
  onFinish: () => void
  finishLabel: string
  canFinish: boolean
}) {
  const { go } = useGame()
  const [hintsShown, setHintsShown] = useState(0)

  return (
    <div className="screen">
      <header className="overworld-head">
        <h1 className="screen-title">{lab.title}</h1>
        <Button variant="ghost" onClick={() => go('home')}>
          Leave
        </Button>
      </header>

      <Panel id="brief">
        <p>{lab.brief}</p>
        <p className="footnote">{lab.objectiveText}</p>
      </Panel>

      <p className="sandbox-notice">{lab.sandboxNotice}</p>

      {children}

      {lab.hints.length > 0 && (
        <Panel id="hints" title="Hints">
          {lab.hints.slice(0, hintsShown).map((hint, i) => (
            <p key={i} className="footnote">
              {i + 1}. {hint}
            </p>
          ))}
          {hintsShown < lab.hints.length ? (
            <Button variant="ghost" full onClick={() => setHintsShown((n) => n + 1)}>
              {hintsShown === 0 ? 'I need a hint' : 'Another hint'}
            </Button>
          ) : (
            <p className="footnote">That is every hint.</p>
          )}
        </Panel>
      )}

      <Button full disabled={!canFinish} onClick={onFinish}>
        {finishLabel}
      </Button>
    </div>
  )
}

function Debrief({ lab, onDone }: { lab: Lab; onDone: () => void }) {
  return (
    <div className="screen">
      <h1 className="screen-title">Debrief</h1>
      <DialogBox speaker={lab.title} text={lab.debrief} canAdvance={false} />
      <Panel id="xp" tone="good">
        <p className="footnote">+{lab.xp} XP</p>
      </Panel>
      <Button full onClick={onDone}>
        Continue
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------

function TerminalLabView({ lab, onDone }: { lab: TerminalLab; onDone: () => void }) {
  const [state, setState] = useState<TerminalState>(() => startTerminal(lab))
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState<number | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.lines])

  const submit = () => {
    setState((s) => runCommand(s, lab, input))
    setInput('')
    setHistoryIndex(null)
  }

  return (
    <LabFrame
      lab={lab}
      onFinish={onDone}
      finishLabel="Report the finding"
      canFinish={isComplete(state, lab)}
    >
      <div className="terminal" ref={logRef} role="log" aria-label="Terminal output">
        {/* `term-ln-` prefix: a line of kind "input" must not collide with
            the `.term-input` text field style. */}
        {state.lines.map((line, i) => (
          <div key={i} className={`term-line term-ln-${line.kind}`}>
            {line.text}
          </div>
        ))}
      </div>

      <form
        className="term-input-row"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="term-input" className="visually-hidden">
          Terminal command
        </label>
        <span className="term-prompt" aria-hidden="true">
          {state.user}@{state.hostname}:{state.cwd}$
        </span>
        <input
          id="term-input"
          className="term-input"
          value={input}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="type a command, or 'help'"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Shell-style history on the arrow keys.
            if (e.key === 'ArrowUp') {
              e.preventDefault()
              const next = historyIndex === null ? state.history.length - 1 : Math.max(0, historyIndex - 1)
              if (state.history[next] !== undefined) {
                setHistoryIndex(next)
                setInput(state.history[next])
              }
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              if (historyIndex === null) return
              const next = historyIndex + 1
              if (next >= state.history.length) {
                setHistoryIndex(null)
                setInput('')
              } else {
                setHistoryIndex(next)
                setInput(state.history[next])
              }
            }
          }}
        />
        <Button type="submit">Run</Button>
      </form>

      <Panel id="goals" title="Objectives">
        <ul className="plain-list">
          {lab.goals.map((goal) => (
            <li key={goal.id} className={state.goalsMet.includes(goal.id) ? 'goal-met' : undefined}>
              <span aria-hidden="true">{state.goalsMet.includes(goal.id) ? '★ ' : '☆ '}</span>
              {goal.description}
            </li>
          ))}
        </ul>
      </Panel>
    </LabFrame>
  )
}

// ---------------------------------------------------------------------------

function LogsLabView({ lab, onDone }: { lab: LogsLab; onDone: () => void }) {
  const { answerLessonCheck } = useGame()
  const [state, setState] = useState<LogsState>(() => startLogs(lab))
  const [submitted, setSubmitted] = useState(false)
  const [chosen, setChosen] = useState<string | null>(null)
  const rows = visibleRows(lab, state)
  const score = scoreLogs(lab, state)

  // Once findings are in, the lab's own question names the pattern they found.
  if (submitted) {
    const question = lab.question
    const answered = chosen !== null
    const correct = question.type === 'single' && chosen === question.answer

    return (
      <div className="screen">
        <h1 className="screen-title">{lab.title}</h1>

        <Panel id="score" tone={score.perfect ? 'good' : 'warn'} title="Your findings">
          <p className="footnote">
            {score.hits} of {score.total} attack entries flagged
            {score.falsePositives > 0 && `, ${score.falsePositives} benign entr${score.falsePositives === 1 ? 'y' : 'ies'} wrongly flagged`}
            {score.misses > 0 && `, ${score.misses} missed`}.
          </p>
          {score.falsePositives > 0 && (
            <p className="footnote">
              A false positive costs real time in a real queue. Being precise matters as much as
              being thorough.
            </p>
          )}
        </Panel>

        <Panel id="log-question">
          <p className="question-prompt">{question.prompt}</p>
        </Panel>

        {question.type === 'single' && !answered && (
          <ul className="choices">
            {shuffleSeeded(question.choices, question.id).map((choice) => (
              <li key={choice.id}>
                <button
                  type="button"
                  className="choice"
                  onClick={() => {
                    setChosen(choice.id)
                    answerLessonCheck(question.id, choice.id === question.answer)
                  }}
                >
                  {choice.text}
                </button>
              </li>
            ))}
          </ul>
        )}

        {question.type === 'single' && answered && (
          <>
            <Panel
              id="log-verdict"
              tone={correct ? 'good' : 'warn'}
              title={correct ? 'Correct' : 'Not quite'}
            >
              <p>{question.explanation}</p>
            </Panel>
            <Panel id="log-choices" title="Each answer">
              <ul className="plain-list">
                {question.choices.map((choice) => (
                  <li
                    key={choice.id}
                    className={
                      choice.id === question.answer
                        ? 'choice-review choice-right'
                        : choice.id === chosen
                          ? 'choice-review choice-chosen'
                          : 'choice-review'
                    }
                  >
                    <strong>{choice.text}</strong>
                    <span className="menu-hint">{choice.why}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          </>
        )}

        {(answered || question.type !== 'single') && (
          <Button full onClick={onDone}>
            Continue
          </Button>
        )}
      </div>
    )
  }

  return (
    <LabFrame
      lab={lab}
      onFinish={() => setSubmitted(true)}
      finishLabel="Submit findings"
      canFinish={state.flagged.length > 0}
    >
      <div className="log-controls">
        <label htmlFor="log-filter" className="visually-hidden">
          Filter log entries
        </label>
        <input
          id="log-filter"
          className="term-input"
          placeholder="filter (user, address, event…)"
          value={state.filter}
          onChange={(e) => setState((s) => setFilter(s, e.target.value))}
        />
      </div>

      <div className="log-table-wrap">
        <table className="log-table">
          <caption className="visually-hidden">
            Simulated log entries. Select a row to flag it as part of the attack.
          </caption>
          <thead>
            <tr>
              <th scope="col">
                <span className="visually-hidden">Flagged</span>
                <span aria-hidden="true">!</span>
              </th>
              {lab.columns.map((col) => (
                <th key={col} scope="col">
                  <button
                    type="button"
                    className="log-sort"
                    onClick={() => setState((s) => setSort(s, col))}
                    aria-label={`Sort by ${col}`}
                  >
                    {col}
                    {state.sortBy === col && (
                      <span aria-hidden="true">{state.sortAsc ? ' ▲' : ' ▼'}</span>
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const flagged = state.flagged.includes(row.id)
              return (
                <tr key={row.id} className={flagged ? 'log-row log-flagged' : 'log-row'}>
                  <td>
                    <input
                      type="checkbox"
                      checked={flagged}
                      onChange={() => setState((s) => toggleFlag(s, row.id))}
                      aria-label={`Flag entry at ${row.cells[lab.columns[0]] ?? row.id}`}
                    />
                  </td>
                  {lab.columns.map((col) => (
                    <td key={col}>{row.cells[col] ?? ''}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="footnote">No entries match that filter.</p>}
      </div>

      <p className="footnote">
        {state.flagged.length} flagged of {score.total} entries in the attack.
      </p>
    </LabFrame>
  )
}

// ---------------------------------------------------------------------------

function PhishingLabView({ lab, onDone }: { lab: PhishingLab; onDone: () => void }) {
  const [state, setState] = useState<PhishingState>(() => startPhishing())
  const email = currentEmail(lab, state)
  const score = scorePhishing(lab, state)

  if (!email) return null
  const given = state.verdicts[email.id]
  const correct = given === email.verdict

  return (
    <LabFrame
      lab={lab}
      onFinish={onDone}
      finishLabel="File the triage report"
      canFinish={isFinished(lab, state)}
    >
      <Panel id="mail">
        <p className="mail-field">
          <strong>From</strong> {email.from}
        </p>
        <p className="mail-field">
          <strong>Subject</strong> {email.subject}
        </p>
        <Button variant="ghost" onClick={() => setState(toggleHeaders)}>
          {state.headersOpen ? 'Hide headers' : 'Show headers'}
        </Button>
        {state.headersOpen && (
          <ul className="headers">
            {email.headers.map((h, i) => (
              <li key={i}>
                <strong>{h.name}:</strong> {h.value}
              </li>
            ))}
          </ul>
        )}
        <pre className="mail-body">{email.body}</pre>

        {email.links.length > 0 && (
          <>
            <h3 className="mail-sub">Links</h3>
            <ul className="plain-list">
              {email.links.map((l, i) => (
                <li key={i}>
                  <span className="link-text">{l.text}</span>
                  <span className="menu-hint">actually points to: {l.href}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {email.attachments.length > 0 && (
          <>
            <h3 className="mail-sub">Attachments</h3>
            <ul className="plain-list">
              {email.attachments.map((a, i) => (
                <li key={i}>
                  {a.filename} <span className="menu-hint">{a.size}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {!given ? (
        <div className="button-row">
          <Button variant="danger" onClick={() => setState((s) => judge(lab, s, 'phish'))}>
            Report as phishing
          </Button>
          <Button variant="ghost" onClick={() => setState((s) => judge(lab, s, 'legitimate'))}>
            Mark legitimate
          </Button>
        </div>
      ) : (
        <>
          <Panel id="verdict" tone={correct ? 'good' : 'warn'} title={correct ? 'Correct' : 'Not quite'}>
            <p className="footnote">
              This message was {email.verdict === 'phish' ? 'phishing' : 'legitimate'}.
            </p>
            <h3 className="mail-sub">What to spot</h3>
            <ul className="plain-list">
              {email.tells.map((tell, i) => (
                <li key={i}>{tell}</li>
              ))}
            </ul>
          </Panel>
          {!isFinished(lab, state) && (
            <Button full onClick={() => setState((s) => nextEmail(lab, s))}>
              Next message
            </Button>
          )}
        </>
      )}

      <p className="footnote">
        {score.correct} correct of {Object.keys(state.verdicts).length} judged ({score.total} in
        total).
      </p>
    </LabFrame>
  )
}

// ---------------------------------------------------------------------------

export function LabScreen() {
  const { activeLabId, finishLab, go } = useGame()
  const [debriefing, setDebriefing] = useState(false)
  const lab = activeLabId ? LAB_BY_ID.get(activeLabId) : undefined

  if (!lab) {
    return (
      <div className="screen">
        <p className="footnote">No lab is open.</p>
        <Button full onClick={() => go('home')}>
          Back
        </Button>
      </div>
    )
  }

  if (debriefing) {
    return (
      <Debrief
        lab={lab}
        onDone={() => {
          setDebriefing(false)
          finishLab(lab.id)
        }}
      />
    )
  }

  const done = () => setDebriefing(true)

  if (lab.engine === 'terminal') return <TerminalLabView lab={lab} onDone={done} />
  if (lab.engine === 'logs') return <LogsLabView lab={lab} onDone={done} />
  return <PhishingLabView lab={lab} onDone={done} />
}
