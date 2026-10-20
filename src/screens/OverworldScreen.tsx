import { useCallback, useEffect, useRef, useState } from 'react'
import { useGame } from '@/state/store'
import { DPad } from '@/ui/DPad'
import { Button } from '@/ui/Button'
import { Panel } from '@/ui/Panel'
import {
  MAP_HEIGHT,
  MAP_WIDTH,
  START,
  gateUnder,
  step,
  tileAt,
  type Direction,
  type Position,
  type TileKind,
} from '@/engine/overworld'
import { VILLAGES } from '@/world'

const TILE = 16
const SCALE = 2
const VIEW_W = 11
const VIEW_H = 9

/** Flat base colour plus a speckle colour, drawn as a cheap pixel texture. */
const TILE_COLOURS: Record<TileKind, [string, string]> = {
  grass: ['#2d4a35', '#365a3f'],
  path: ['#6b5f47', '#7d7054'],
  water: ['#1f3a5c', '#2a4d78'],
  tree: ['#1b3324', '#24452f'],
  rock: ['#3d4654', '#4b5565'],
  bridge: ['#7a5c3a', '#8d6c45'],
  gate: ['#8c6a2f', '#b08a3d'],
}

export function OverworldScreen() {
  const { go, sfx } = useGame()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [position, setPosition] = useState<Position>(START)
  const [facing, setFacing] = useState<Direction>('down')

  const gate = gateUnder(position)
  const village = VILLAGES.find((v) => v.id === gate)

  const move = useCallback(
    (direction: Direction) => {
      setFacing(direction)
      setPosition((current) => {
        const next = step(current, direction)
        if (next !== current) sfx('select')
        return next
      })
    },
    [sfx],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      const map: Record<string, Direction> = {
        arrowup: 'up',
        w: 'up',
        arrowdown: 'down',
        s: 'down',
        arrowleft: 'left',
        a: 'left',
        arrowright: 'right',
        d: 'right',
      }
      if (map[key]) {
        e.preventDefault()
        move(map[key])
      } else if (key === 'escape') {
        e.preventDefault()
        go('home')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [move, go])

  // Draw the viewport, centred on the player and clamped to the map edges.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const originX = Math.max(0, Math.min(MAP_WIDTH - VIEW_W, position.x - (VIEW_W >> 1)))
    const originY = Math.max(0, Math.min(MAP_HEIGHT - VIEW_H, position.y - (VIEW_H >> 1)))

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let row = 0; row < VIEW_H; row++) {
      for (let col = 0; col < VIEW_W; col++) {
        const mapX = originX + col
        const mapY = originY + row
        const tile = tileAt(mapX, mapY)
        const [base, speckle] = TILE_COLOURS[tile.kind]
        const px = col * TILE * SCALE
        const py = row * TILE * SCALE

        ctx.fillStyle = base
        ctx.fillRect(px, py, TILE * SCALE, TILE * SCALE)

        // A deterministic speckle so the ground has texture but never shimmers.
        ctx.fillStyle = speckle
        for (let i = 0; i < 6; i++) {
          const hash = (mapX * 73856093) ^ (mapY * 19349663) ^ (i * 83492791)
          const sx = Math.abs(hash % TILE)
          const sy = Math.abs((hash >> 8) % TILE)
          ctx.fillRect(px + sx * SCALE, py + sy * SCALE, SCALE, SCALE)
        }

        if (tile.kind === 'gate') {
          ctx.fillStyle = '#e8c35a'
          ctx.fillRect(px + 4 * SCALE, py + 3 * SCALE, 8 * SCALE, 2 * SCALE)
          ctx.fillRect(px + 4 * SCALE, py + 3 * SCALE, 2 * SCALE, 10 * SCALE)
          ctx.fillRect(px + 10 * SCALE, py + 3 * SCALE, 2 * SCALE, 10 * SCALE)
        }
      }
    }

    // The warden. Drawn with a dark outline so the figure reads against
    // both the pale path and the dark grass.
    const heroX = (position.x - originX) * TILE * SCALE
    const heroY = (position.y - originY) * TILE * SCALE
    const px = (x: number, y: number, w: number, h: number, colour: string) => {
      ctx.fillStyle = colour
      ctx.fillRect(heroX + x * SCALE, heroY + y * SCALE, w * SCALE, h * SCALE)
    }

    px(3, 2, 10, 13, '#0e1319') // outline
    px(5, 3, 6, 4, '#e8c9a0') // head
    px(4, 7, 8, 6, '#5aa9e8') // body
    px(5, 13, 2, 2, '#0e1319') // legs
    px(9, 13, 2, 2, '#0e1319')

    // Facing cue: the scarf trails behind the direction of travel.
    const scarf: Record<Direction, [number, number, number, number]> = {
      up: [5, 12, 6, 2],
      down: [5, 1, 6, 2],
      left: [11, 7, 3, 3],
      right: [2, 7, 3, 3],
    }
    const [sx, sy, sw, sh] = scarf[facing]
    px(sx, sy, sw, sh, '#e8615a')

  }, [position, facing])

  return (
    <div className="screen">
      <header className="overworld-head">
        <h1 className="screen-title">The Ori</h1>
        <Button variant="ghost" onClick={() => go('home')}>
          Back
        </Button>
      </header>

      <div className="overworld-frame">
        <canvas
          ref={canvasRef}
          width={VIEW_W * TILE * SCALE}
          height={VIEW_H * TILE * SCALE}
          role="img"
          aria-label={`Overworld map. You are at ${position.x}, ${position.y}${
            village ? `, at the gate of ${village.name}` : ''
          }.`}
        />
      </div>

      {village ? (
        <Panel id="gate" tone={village.status === 'open' ? 'good' : 'warn'}>
          <p>
            <strong>{village.name}</strong> — {village.epithet}
          </p>
          <p className="footnote">{village.teaches}</p>
          {village.status === 'open' ? (
            <Button
              full
              onClick={() => {
                sfx('confirm')
                go('village')
              }}
            >
              Enter {village.name}
            </Button>
          ) : (
            <p className="notice notice-bad">
              The gate is sealed. This village opens in a later chapter.
            </p>
          )}
        </Panel>
      ) : (
        <p className="footnote">
          Walk with the pad, the arrow keys or WASD. Village gates are marked in gold.
        </p>
      )}

      <DPad onPress={move} />
    </div>
  )
}
