import type { Direction } from '@/engine/overworld'

/**
 * Thumb controls. Pointer events rather than click so a held press repeats
 * naturally via the parent's interval, and so it works under touch without
 * waiting for the 300ms click resolution.
 */
export function DPad({ onPress }: { onPress: (direction: Direction) => void }) {
  const pad = (direction: Direction, glyph: string, label: string, className: string) => (
    <button
      type="button"
      className={`dpad-btn ${className}`}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault()
        onPress(direction)
      }}
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  )

  return (
    <div className="dpad" role="group" aria-label="Movement">
      {pad('up', '▲', 'Move up', 'dpad-up')}
      {pad('left', '◀', 'Move left', 'dpad-left')}
      {pad('right', '▶', 'Move right', 'dpad-right')}
      {pad('down', '▼', 'Move down', 'dpad-down')}
      <span className="dpad-hub" aria-hidden="true" />
    </div>
  )
}
