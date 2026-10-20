import { useEffect, useRef, useState } from 'react'

/**
 * Reveals text one character at a time, retro dialog-box style.
 *
 * Honours reduced motion by revealing instantly, and exposes `skip()` so a
 * tap always completes the line rather than making the player wait. The full
 * text is always present in the DOM for screen readers - only the visible
 * slice animates.
 */
export function useTypewriter(
  text: string,
  { charsPerSecond = 45, enabled = true }: { charsPerSecond?: number; enabled?: boolean } = {},
) {
  const [revealed, setRevealed] = useState(enabled ? 0 : text.length)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    if (!enabled) {
      setRevealed(text.length)
      return
    }

    setRevealed(0)
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = (now - start) / 1000
      const next = Math.min(text.length, Math.floor(elapsed * charsPerSecond))
      setRevealed(next)
      if (next < text.length) {
        frame.current = requestAnimationFrame(tick)
      } else {
        frame.current = null
      }
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
    }
  }, [text, charsPerSecond, enabled])

  const skip = () => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    setRevealed(text.length)
  }

  return { visible: text.slice(0, revealed), done: revealed >= text.length, skip }
}
