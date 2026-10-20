import { describe, it, expect } from 'vitest'
import {
  tileAt,
  canEnter,
  step,
  gateUnder,
  allGates,
  reachableFrom,
  START,
  MAP_WIDTH,
  MAP_HEIGHT,
  MAP_ROWS,
  type Position,
} from '@/engine/overworld'
import { VILLAGES } from '@/world'

describe('map shape', () => {
  it('is rectangular', () => {
    expect(MAP_ROWS.every((r) => r.length === MAP_WIDTH)).toBe(true)
    expect(MAP_ROWS).toHaveLength(MAP_HEIGHT)
  })

  it('is fully enclosed, so the player cannot walk off the edge', () => {
    for (let x = 0; x < MAP_WIDTH; x++) {
      expect(canEnter(x, 0)).toBe(false)
      expect(canEnter(x, MAP_HEIGHT - 1)).toBe(false)
    }
    for (let y = 0; y < MAP_HEIGHT; y++) {
      expect(canEnter(0, y)).toBe(false)
      expect(canEnter(MAP_WIDTH - 1, y)).toBe(false)
    }
  })

  it('treats out-of-bounds as solid rather than throwing', () => {
    expect(() => tileAt(-5, -5)).not.toThrow()
    expect(canEnter(-1, 0)).toBe(false)
    expect(canEnter(MAP_WIDTH + 10, 3)).toBe(false)
  })
})

describe('tiles', () => {
  it('blocks water, trees and rock', () => {
    const kinds = ['water', 'tree', 'rock']
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = tileAt(x, y)
        if (kinds.includes(tile.kind)) expect(tile.passable).toBe(false)
      }
    }
  })

  it('allows grass, path, bridge and gates', () => {
    const kinds = ['grass', 'path', 'bridge', 'gate']
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = tileAt(x, y)
        if (kinds.includes(tile.kind)) expect(tile.passable).toBe(true)
      }
    }
  })
})

describe('movement', () => {
  it('moves into open ground', () => {
    const open: Position = START
    expect(canEnter(open.x, open.y)).toBe(true)
    const moved = step(open, 'left')
    expect(moved).not.toEqual(open)
  })

  it('refuses to move into a blocked tile and stays put', () => {
    // Find a passable tile with a blocked neighbour above it.
    let probe: Position | null = null
    for (let y = 1; y < MAP_HEIGHT && !probe; y++) {
      for (let x = 1; x < MAP_WIDTH; x++) {
        if (canEnter(x, y) && !canEnter(x, y - 1)) {
          probe = { x, y }
          break
        }
      }
    }
    expect(probe).not.toBeNull()
    expect(step(probe!, 'up')).toEqual(probe)
  })

  it('never lands on an impassable tile, whatever the walk', () => {
    let pos = START
    const dirs = ['up', 'down', 'left', 'right'] as const
    for (let i = 0; i < 500; i++) {
      pos = step(pos, dirs[i % 4])
      expect(canEnter(pos.x, pos.y)).toBe(true)
    }
  })

  it('is reversible on open ground', () => {
    const right = step(START, 'right')
    if (right !== START) expect(step(right, 'left')).toEqual(START)
  })
})

describe('gates', () => {
  it('places one gate per village', () => {
    const gates = allGates()
    expect(gates).toHaveLength(VILLAGES.length)
    expect(new Set(gates.map((g) => g.id)).size).toBe(VILLAGES.length)
  })

  it('maps gate glyphs to real village ids', () => {
    const ids = new Set<string>(VILLAGES.map((v) => v.id))
    for (const gate of allGates()) expect(ids.has(gate.id)).toBe(true)
  })

  it('reports the gate the player stands on', () => {
    const hakumura = allGates().find((g) => g.id === 'hakumura')!
    expect(gateUnder(hakumura.position)).toBe('hakumura')
    expect(gateUnder(START)).toBeNull()
  })
})

describe('reachability', () => {
  const reachable = reachableFrom(START)

  it('the player starts somewhere walkable', () => {
    expect(canEnter(START.x, START.y)).toBe(true)
  })

  it('every village gate can actually be walked to', () => {
    for (const gate of allGates()) {
      expect(
        reachable.has(`${gate.position.x},${gate.position.y}`),
        `${gate.id} at ${gate.position.x},${gate.position.y} is unreachable`,
      ).toBe(true)
    }
  })

  it('the walkable area is a decent size, not a closet', () => {
    expect(reachable.size).toBeGreaterThan(150)
  })
})
