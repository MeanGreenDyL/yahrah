import { useState } from 'react'
import { useGame } from '@/state/store'
import { DialogBox } from '@/ui/DialogBox'
import { Button } from '@/ui/Button'
import { THREE_VOWS } from '@/world'

const INTRO = [
  {
    speaker: 'Orinushi Sagae',
    text: 'So. You want to learn to read the Weave. Before I teach you anything that can open a door, you will learn what it costs to open the wrong one.',
  },
  {
    speaker: 'Orinushi Sagae',
    text: 'Every Warden swears three vows. Not for ceremony. Because the skills you are about to learn are the same ones the Kagemono use, and the only thing that separates you from them is where you point them.',
  },
]

/**
 * The ethics charter. Deliberately not skippable on a first run - the brief
 * calls it non-negotiable, and so it is.
 */
export function VowsScreen() {
  const { acceptVows, sfx } = useGame()
  const [beat, setBeat] = useState(0)
  const introDone = beat >= INTRO.length

  return (
    <div className="screen">
      <h1 className="screen-title">The Three Vows</h1>

      {!introDone && (
        <DialogBox
          speaker={INTRO[beat].speaker}
          text={INTRO[beat].text}
          onAdvance={() => {
            sfx('confirm')
            setBeat((b) => b + 1)
          }}
        />
      )}

      {introDone && (
        <>
          <ol className="vows-list">
            {THREE_VOWS.map((vow) => (
              <li className="vow" key={vow.id}>
                <strong>{vow.title}</strong>
                <span>{vow.text}</span>
              </li>
            ))}
          </ol>
          <p className="footnote">
            Everything you do in Yahrah happens inside a simulation. No lab in this game touches a
            real network, host or account — and nothing you learn here licenses you to touch one
            without the mandate above.
          </p>
          <Button
            full
            onClick={() => {
              sfx('levelup')
              acceptVows()
            }}
          >
            I take the vows
          </Button>
        </>
      )}
    </div>
  )
}
