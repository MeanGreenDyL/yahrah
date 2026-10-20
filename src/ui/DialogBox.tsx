import { useEffect } from 'react'
import { useTypewriter } from './useTypewriter'
import { usePrefersReducedMotion } from './usePrefersReducedMotion'

/**
 * The retro dialog box. Tap or press Enter/Space to finish the line, then
 * again to advance.
 */
export function DialogBox({
  speaker,
  text,
  onAdvance,
  canAdvance = true,
}: {
  speaker?: string
  text: string
  onAdvance?: () => void
  canAdvance?: boolean
}) {
  const reduced = usePrefersReducedMotion()
  const { visible, done, skip } = useTypewriter(text, { enabled: !reduced })

  const act = () => {
    if (!done) {
      skip()
      return
    }
    if (canAdvance) onAdvance?.()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        act()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className="dialog"
      role="button"
      tabIndex={0}
      onClick={act}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') e.preventDefault()
      }}
      aria-label={done ? 'Continue' : 'Reveal the rest of this line'}
    >
      {speaker && <div className="dialog-speaker">{speaker}</div>}
      {/*
        The full text is in the DOM for assistive tech; the animated slice is
        aria-hidden so a screen reader is not fed a stuttering half-sentence.
      */}
      <p className="dialog-text" aria-hidden="true">
        {visible}
        {!done && <span className="dialog-caret" />}
      </p>
      <p className="visually-hidden">{text}</p>
      {done && canAdvance && <div className="dialog-more" aria-hidden="true">▼</div>}
    </div>
  )
}
