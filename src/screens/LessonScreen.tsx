import { useState } from 'react'
import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Button } from '@/ui/Button'
import { DialogBox } from '@/ui/DialogBox'
import { LESSON_BY_ID, QUESTION_BY_ID } from '@/content'
import { shuffleSeeded } from '@/engine/shuffle'

/**
 * A lesson is a run of dialog beats with questions woven in. A `check` beat
 * must be answered before the lesson continues, and the explanation shows
 * either way.
 */
export function LessonScreen() {
  const { activeLessonId, finishLesson, answerLessonCheck, go } = useGame()
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)

  const lesson = activeLessonId ? LESSON_BY_ID.get(activeLessonId) : undefined
  if (!lesson) {
    return (
      <div className="screen">
        <p className="footnote">No lesson is open.</p>
        <Button full onClick={() => go('village')}>
          Back
        </Button>
      </div>
    )
  }

  const beat = lesson.beats[index]
  const atEnd = index >= lesson.beats.length

  if (atEnd) {
    return (
      <div className="screen">
        <h1 className="screen-title">{lesson.title}</h1>
        <Panel id="outcome" tone="good" title="You can now">
          <p>{lesson.outcome}</p>
        </Panel>
        <Button full onClick={() => finishLesson(lesson.id)}>
          Continue
        </Button>
      </div>
    )
  }

  const advance = () => {
    setChosen(null)
    setIndex((i) => i + 1)
  }

  return (
    <div className="screen">
      <header className="overworld-head">
        <h1 className="screen-title">{lesson.title}</h1>
        <Button variant="ghost" onClick={() => go('village')}>
          Leave
        </Button>
      </header>

      <div className="lesson-progress" aria-hidden="true">
        {lesson.beats.map((_, i) => (
          <span key={i} className={i <= index ? 'pip pip-on' : 'pip'} />
        ))}
      </div>

      {beat.kind === 'dialog' && (
        <DialogBox speaker={beat.speaker} text={beat.text} onAdvance={advance} />
      )}

      {beat.kind === 'note' && (
        <>
          <Panel id="note" title={beat.title}>
            <p>{beat.text}</p>
          </Panel>
          <Button full onClick={advance}>
            Continue
          </Button>
        </>
      )}

      {beat.kind === 'compare' && (
        <>
          <Panel id="compare" title={beat.title}>
            <dl className="compare">
              {beat.rows.map((row, i) => (
                <div className="compare-row" key={i}>
                  <dt>{row.term}</dt>
                  <dd>{row.meaning}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Button full onClick={advance}>
            Continue
          </Button>
        </>
      )}

      {beat.kind === 'check' && <CheckBeat questionId={beat.questionId} chosen={chosen} onChoose={(id, correct) => { setChosen(id); answerLessonCheck(beat.questionId, correct) }} onAdvance={advance} />}
    </div>
  )
}

function CheckBeat({
  questionId,
  chosen,
  onChoose,
  onAdvance,
}: {
  questionId: string
  chosen: string | null
  onChoose: (choiceId: string, correct: boolean) => void
  onAdvance: () => void
}) {
  const question = QUESTION_BY_ID.get(questionId)
  if (!question || question.type !== 'single') {
    return (
      <>
        <p className="notice notice-bad">This check is not playable yet.</p>
        <Button full onClick={onAdvance}>
          Continue
        </Button>
      </>
    )
  }

  const choices = shuffleSeeded(question.choices, question.id)
  const answered = chosen !== null
  const correct = chosen === question.answer

  return (
    <>
      <Panel id="check" title="Check yourself">
        <p className="question-prompt">{question.prompt}</p>
      </Panel>

      {!answered ? (
        <ul className="choices">
          {choices.map((choice) => (
            <li key={choice.id}>
              <button
                type="button"
                className="choice"
                onClick={() => onChoose(choice.id, choice.id === question.answer)}
              >
                {choice.text}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <Panel
            id="check-verdict"
            tone={correct ? 'good' : 'warn'}
            title={correct ? 'Correct' : 'Not quite'}
          >
            <p>{question.explanation}</p>
          </Panel>
          <Panel id="check-choices" title="Each answer">
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
          <Button full onClick={onAdvance}>
            Continue
          </Button>
        </>
      )}
    </>
  )
}
