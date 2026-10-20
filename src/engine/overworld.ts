import { VILLAGES } from '@/world'

/**
 * The overworld: a tile grid the player walks with a D-pad or the keyboard.
 *
 * All movement rules live here as pure functions so they can be tested
 * without a canvas. The renderer only draws what these return.
 */

export type TileKind = 'grass' | 'path' | 'water' | 'tree' | 'rock' | 'gate' | 'bridge'

export type Tile = {
  kind: TileKind
  passable: boolean
  /** Village id when this tile is a gate. */
  gate?: string
}

/**
 * Map legend:
 *   . grass   : path    ~ water   T tree   # rock   = bridge
 *   1-7 village gates, in VILLAGES order
 */
const LEGEND: Record<string, TileKind> = {
  '.': 'grass',
  ':': 'path',
  '~': 'water',
  T: 'tree',
  '#': 'rock',
  '=': 'bridge',
}

export const MAP_ROWS = [
  'TTTTTTTTTTTTTTTTTTTTTTTT',
  'T......................T',
  'T....#1#.......#2#.....T',
  'T......:.........:.....T',
  'T......:.........:.....T',
  'T::::::::::::::::::::::T',
  'T......:.........:.....T',
  'T..TT..:...~~~...:..TT.T',
  'T..TT..:..~~~~~..:..TT.T',
  'T......:...===...:.....T',
  'T......:..~~~~~..:.....T',
  'T......:...~~~...:.....T',
  'T......:.........:.....T',
  'T::::::::::::::::::::::T',
  'T......:.........:.....T',
  'T....#3#.......#4#.....T',
  'T......................T',
  'T..TT..............TT..T',
  'T::::::::::::::::::::::T',
  'T......:.........:.....T',
  'T....#5#.......#6#.....T',
  'T......................T',
  'T.........#7#..........T',
  'TTTTTTTTTTTTTTTTTTTTTTTT',
]

export const MAP_WIDTH = MAP_ROWS[0].length
export const MAP_HEIGHT = MAP_ROWS.length

/** Where the player stands on a fresh save: the crossroads below Hakumura. */
export const START: Position = { x: 12, y: 5 }

export type Position = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'

const DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

export function tileAt(x: number, y: number): Tile {
  if (x < 0 || y < 0 || y >= MAP_HEIGHT || x >= MAP_WIDTH) {
    return { kind: 'rock', passable: false }
  }
  const ch = MAP_ROWS[y][x]

  const gateIndex = '1234567'.indexOf(ch)
  if (gateIndex >= 0) {
    const village = VILLAGES[gateIndex]
    return { kind: 'gate', passable: true, gate: village?.id }
  }

  const kind = LEGEND[ch] ?? 'grass'
  return { kind, passable: kind !== 'water' && kind !== 'tree' && kind !== 'rock' }
}

export function canEnter(x: number, y: number): boolean {
  return tileAt(x, y).passable
}

/**
 * Attempt a step. Returns the new position, or the old one when blocked -
 * walking into a tree should not move you, and should not throw.
 */
export function step(from: Position, direction: Direction): Position {
  const delta = DELTAS[direction]
  const next = { x: from.x + delta.x, y: from.y + delta.y }
  return canEnter(next.x, next.y) ? next : from
}

/** The village gate the player is standing on, if any. */
export function gateUnder(position: Position): string | null {
  return tileAt(position.x, position.y).gate ?? null
}

/** Every gate on the map, for the minimap and for tests. */
export function allGates(): { id: string; position: Position }[] {
  const gates: { id: string; position: Position }[] = []
  for (let y = 0; y < MAP_HEIGHT; y++) {
    for (let x = 0; x < MAP_WIDTH; x++) {
      const tile = tileAt(x, y)
      if (tile.gate) gates.push({ id: tile.gate, position: { x, y } })
    }
  }
  return gates
}

/**
 * Breadth-first reachability from a position, used to guarantee the map is
 * actually walkable rather than merely pretty.
 */
export function reachableFrom(origin: Position): Set<string> {
  const seen = new Set<string>()
  const queue: Position[] = [origin]
  seen.add(`${origin.x},${origin.y}`)

  while (queue.length) {
    const current = queue.shift()!
    for (const direction of Object.keys(DELTAS) as Direction[]) {
      const delta = DELTAS[direction]
      const next = { x: current.x + delta.x, y: current.y + delta.y }
      const key = `${next.x},${next.y}`
      if (seen.has(key) || !canEnter(next.x, next.y)) continue
      seen.add(key)
      queue.push(next)
    }
  }
  return seen
}
