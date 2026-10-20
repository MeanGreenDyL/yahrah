import { useMemo, useState } from 'react'
import { useGame } from '@/state/store'
import { Panel } from '@/ui/Panel'
import { Button } from '@/ui/Button'
import { Meter } from '@/ui/Meter'
import { Sprite } from '@/ui/Sprite'
import { DialogBox } from '@/ui/DialogBox'
import { currentQuestionId, effectivenessLabel, type BattleState } from '@/engine/battle'
import { CREATURE_BY_ID, QUESTION_BY_ID } from '@/content'
import type { Question } from '@/content/schemas'
import { shuffleSeeded } from '@/engine/shuffle'

/** Render one question's controls and report the chosen answer's correctness. */
function QuestionBody({
  question,
  onAnswer,
}: {
  question: Question
  onAnswer: (correct: boolean, chosenId: string) => void
}) {
  if (question.type === 'single') {
    // Seeded by question id: stable for this question, varied across them,
    // so the correct answer is never reliably in the same slot.
    const choices = shuffleSeeded(question.choices, question.id)
    return (
      <ul className="choices">
        {choices.map((choice) => (
          <li key={choice.id}>
            <button
              type="button"
              className="choice"
              onClick={() => onAnswer(choice.id === question.answer, choice.id)}
            >
              {choice.text}
            </button>
          </li>
        ))}
      </ul>
    )
  }

  // Other formats land with the lesson engine in M5; nothing silently guesses.
  return <p className="notice notice-bad">This question format is not playable yet.</p>
}

export function BattleScreen() {
  const { battle, answerBattle, advanceBattle, leaveBattle, save } = useGame()
  const [chosen, setChosen] = useState<string | null>(null)

  const questionId = battle ? currentQuestionId(battle) : null
  const question = questionId ? QUESTION_BY_ID.get(questionId) : undefined
  const foeCreature = battle ? CREATURE_BY_ID.get(battle.foe.creatureId) : undefined

  if (!battle) {
    return (
      <div className="screen">
        <p className="footnote">No encounter in progress.</p>
        <Button full onClick={() => leaveBattle()}>
          Back
        </Button>
      </div>
    )
  }

  if (battle.phase === 'won' || battle.phase === 'lost') {
    return <BattleResult battle={battle} onDone={() => leaveBattle()} />
  }

  return (
    <div className="screen">
      <Panel id="foe">
        <div className="foe">
          {foeCreature && <Sprite data={foeCreature.sprite} scale={4} label={foeCreature.name} />}
          <div className="foe-info">
            <h1 className="screen-title">{battle.foe.name}</h1>
            <p className="menu-hint">{foeCreature?.realWorld}</p>
            <Meter label="Foe" value={battle.foeHp} max={battle.foe.maxHp} tone="hp" segments={12} />
          </div>
        </div>
      </Panel>

      <Meter
        label={`${save.profile.name}`}
        value={battle.playerHp}
        max={battle.playerMaxHp}
        tone="hp"
        segments={12}
      />

      {battle.phase === 'question' && question && (
        <>
          <Panel id="question">
            <p className="question-prompt">{question.prompt}</p>
          </Panel>
          <QuestionBody
            question={question}
            onAnswer={(correct, choiceId) => {
              setChosen(choiceId)
              answerBattle(correct)
            }}
          />
        </>
      )}

      {battle.phase === 'feedback' && battle.last && question && (
        <>
          <Panel
            id="verdict"
            tone={battle.last.correct ? 'good' : 'warn'}
            title={battle.last.correct ? 'Correct' : 'Not quite'}
          >
            <p className="footnote">
              {battle.last.correct
                ? effectivenessLabel(battle.last.multiplier)
                : `${battle.foe.name} strikes back.`}
            </p>
          </Panel>

          {/* The explanation is the teaching, so it is always shown. */}
          <DialogBox speaker="Why" text={battle.last.explanation} canAdvance={false} />

          {question.type === 'single' && (
            <Panel id="choices-review" title="Each answer">
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
          )}

          <Button
            full
            onClick={() => {
              setChosen(null)
              advanceBattle()
            }}
          >
            Continue
          </Button>
        </>
      )}
    </div>
  )
}

function BattleResult({ battle, onDone }: { battle: BattleState; onDone: () => void }) {
  const won = battle.phase === 'won'
  const pct = useMemo(
    () =>
      battle.answeredCount === 0
        ? 0
        : Math.round((battle.correctCount / battle.answeredCount) * 100),
    [battle.correctCount, battle.answeredCount],
  )

  return (
    <div className="screen screen-centred">
      <h1 className="screen-title">{won ? 'The Sakeme closes' : 'You withdraw'}</h1>
      <Panel id="result" tone={won ? 'good' : 'warn'}>
        <p>
          {won
            ? `${battle.foe.name} unravels back into the Weave.`
            : `${battle.foe.name} drives you back. The concepts it carried are still yours to learn.`}
        </p>
        <p className="footnote">
          {battle.correctCount} of {battle.answeredCount} correct ({pct}%)
        </p>
        <p className="footnote">+{battle.xpEarned} XP</p>
      </Panel>
      <Button full onClick={onDone}>
        Continue
      </Button>
    </div>
  )
}
