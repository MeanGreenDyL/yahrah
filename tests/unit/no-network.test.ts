import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

/**
 * Yahrah is offline-first and makes no runtime network calls. This is a
 * safety guarantee, not a performance preference: no lab may ever reach a
 * real host. Guard it at the source level.
 */
const SRC = join(import.meta.dirname, '..', '..', 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

const sourceFiles = walk(SRC).filter((f) => ['.ts', '.tsx'].includes(extname(f)))

describe('no runtime network access', () => {
  it('finds source files to check', () => {
    expect(sourceFiles.length).toBeGreaterThan(0)
  })

  it.each([
    ['fetch(', /\bfetch\s*\(/],
    ['XMLHttpRequest', /\bXMLHttpRequest\b/],
    ['WebSocket', /\bWebSocket\b/],
    ['EventSource', /\bEventSource\b/],
    ['navigator.sendBeacon', /navigator\s*\.\s*sendBeacon/],
  ])('no source file uses %s', (_label, pattern) => {
    const offenders = sourceFiles.filter((file) => pattern.test(readFileSync(file, 'utf8')))
    expect(offenders).toEqual([])
  })
})
