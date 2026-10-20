/** A segmented bar, for XP, health and mastery. Readable without colour alone. */
export function Meter({
  value,
  max,
  label,
  tone = 'xp',
  segments = 20,
}: {
  value: number
  max: number
  label: string
  tone?: 'xp' | 'hp' | 'mastery'
  segments?: number
}) {
  const safeMax = Math.max(1, max)
  const ratio = Math.max(0, Math.min(1, value / safeMax))
  const filled = Math.round(ratio * segments)

  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <span className="meter-value">
          {value} / {safeMax}
        </span>
      </div>
      <div
        className={`meter-track meter-${tone}`}
        role="progressbar"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
      >
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={i < filled ? 'seg seg-on' : 'seg'} />
        ))}
      </div>
    </div>
  )
}
