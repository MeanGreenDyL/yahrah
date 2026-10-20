import { useCallback, useEffect, useRef, useState } from 'react'

export type MenuItem = {
  id: string
  label: string
  hint?: string
  disabled?: boolean
}

/**
 * A handheld-style menu. Arrow keys and WASD move the cursor, Enter selects,
 * Escape backs out. Every row is also a plain tap target, because none of
 * this may be keyboard-only.
 *
 * The cursor is mirrored into a ref. React state alone is not enough here:
 * two keypresses inside a single frame would both read the pre-render value,
 * so pressing Down-then-Enter quickly would select the previous item.
 */
export function Menu({
  items,
  onSelect,
  onCancel,
  label,
  active = true,
}: {
  items: MenuItem[]
  onSelect: (id: string) => void
  onCancel?: () => void
  label: string
  /**
   * Whether this menu owns the keyboard. Only one menu on a screen may be
   * active: otherwise every arrow key drives them all at once and each shows
   * its own cursor, so two rows look selected simultaneously.
   */
  active?: boolean
}) {
  const enabled = items.filter((i) => !i.disabled)

  const [cursor, setCursorState] = useState(0)
  const cursorRef = useRef(0)
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  // Latest props, readable from the keydown handler without re-subscribing.
  const latest = useRef({ enabled, onSelect, onCancel })
  latest.current = { enabled, onSelect, onCancel }

  const moveCursor = useCallback((delta: number) => {
    const count = latest.current.enabled.length
    if (count === 0) return
    const next = (cursorRef.current + delta + count) % count
    cursorRef.current = next
    setCursorState(next)
  }, [])

  // Keep the cursor on a selectable row if the list shrinks under us.
  useEffect(() => {
    if (cursorRef.current >= enabled.length) {
      const next = Math.max(0, enabled.length - 1)
      cursorRef.current = next
      setCursorState(next)
    }
  }, [enabled.length])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (key === 'arrowdown' || key === 's') {
        e.preventDefault()
        moveCursor(1)
      } else if (key === 'arrowup' || key === 'w') {
        e.preventDefault()
        moveCursor(-1)
      } else if (key === 'enter') {
        e.preventDefault()
        const item = latest.current.enabled[cursorRef.current]
        if (item) latest.current.onSelect(item.id)
      } else if (key === 'escape') {
        e.preventDefault()
        latest.current.onCancel?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moveCursor, active])

  // Only the active menu pulls focus, and never on first paint - stealing
  // focus on mount would yank a screen reader off the heading.
  const mounted = useRef(false)
  useEffect(() => {
    if (!active) return
    if (!mounted.current) {
      mounted.current = true
      return
    }
    refs.current[cursor]?.focus()
  }, [cursor, active])

  return (
    <ul className="menu" role="menu" aria-label={label}>
      {items.map((item) => {
        const index = enabled.indexOf(item)
        const isCursor = index === cursor && !item.disabled && active
        return (
          <li key={item.id} role="none">
            <button
              type="button"
              role="menuitem"
              ref={(el) => {
                if (index >= 0) refs.current[index] = el
              }}
              className={isCursor ? 'menu-item menu-item-active' : 'menu-item'}
              disabled={item.disabled}
              onMouseEnter={() => {
                if (index >= 0) {
                  cursorRef.current = index
                  setCursorState(index)
                }
              }}
              onClick={() => onSelect(item.id)}
            >
              <span className="menu-cursor" aria-hidden="true">
                {isCursor ? '▶' : ' '}
              </span>
              <span className="menu-label">
                {item.label}
                {item.hint && <span className="menu-hint">{item.hint}</span>}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
