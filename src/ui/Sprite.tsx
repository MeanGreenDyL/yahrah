import { useEffect, useRef } from 'react'
import type { Sprite as SpriteData } from '@/content/schemas'

/**
 * Renders a palette-indexed pixel grid to a canvas at an integer scale, so
 * edges stay crisp. Sprites are data, never image files - see DECISIONS D4.
 */
export function Sprite({
  data,
  scale = 4,
  label,
}: {
  data: SpriteData
  scale?: number
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (let y = 0; y < data.height; y++) {
      const row = data.rows[y]
      for (let x = 0; x < data.width; x++) {
        const key = row[x]
        if (key === '.' || key === undefined) continue
        const colour = data.palette[key]
        if (!colour) continue
        ctx.fillStyle = colour
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }, [data, scale])

  return (
    <canvas
      ref={ref}
      width={data.width * scale}
      height={data.height * scale}
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ width: data.width * scale, height: data.height * scale }}
    />
  )
}
