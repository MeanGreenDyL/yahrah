import { useEffect, useState } from 'react'

/**
 * Resolves the effective motion preference: the player's explicit setting
 * wins, and 'auto' defers to the OS.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const explicit = document.documentElement.dataset.motion
    if (explicit === 'reduced') {
      setReduced(true)
      return
    }
    if (explicit === 'full') {
      setReduced(false)
      return
    }

    if (typeof matchMedia !== 'function') return
    const mq = matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  })

  return reduced
}
