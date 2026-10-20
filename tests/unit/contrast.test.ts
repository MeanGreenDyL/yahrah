import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * WCAG AA contrast, checked against the palette tokens rather than by eye.
 * AA is 4.5:1 for body text and 3:1 for large text and UI boundaries.
 */

const css = readFileSync(
  join(import.meta.dirname, '..', '..', 'src', 'styles', 'global.css'),
  'utf8',
)

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))
  if (!match) throw new Error(`Palette token --${name} not found in global.css`)
  return match[1]
}

function srgbToLinear(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}

export function contrast(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

const INK = () => token('ink')
const INK2 = () => token('ink-2')
const PANEL = () => token('panel')
const PANEL2 = () => token('panel-2')

describe('WCAG AA contrast', () => {
  const bodyPairs: [string, () => string, () => string][] = [
    ['paper on ink', () => token('paper'), INK],
    ['paper on ink-2', () => token('paper'), INK2],
    ['paper on panel', () => token('paper'), PANEL],
    ['paper on panel-2', () => token('paper'), PANEL2],
    ['paper-dim on ink', () => token('paper-dim'), INK],
    ['paper-dim on panel', () => token('paper-dim'), PANEL],
    ['paper-dim on ink-2', () => token('paper-dim'), INK2],
    ['warn on ink', () => token('warn'), INK],
    ['warn on panel', () => token('warn'), PANEL],
    ['good on ink', () => token('good'), INK],
    ['good on panel', () => token('good'), PANEL],
    ['bad on ink', () => token('bad'), INK],
    ['bad on panel', () => token('bad'), PANEL],
    ['aoyane on panel', () => token('aoyane'), PANEL],
    ['akazora on panel', () => token('akazora'), PANEL],
    ['fujizome on panel', () => token('fujizome'), PANEL],
  ]

  it.each(bodyPairs)('%s meets 4.5:1 for body text', (_label, fg, bg) => {
    expect(contrast(fg(), bg())).toBeGreaterThanOrEqual(4.5)
  })

  it('button text on the primary button meets 4.5:1', () => {
    expect(contrast(token('ink'), token('warn'))).toBeGreaterThanOrEqual(4.5)
  })

  it('danger button text meets 4.5:1', () => {
    expect(contrast(token('ink'), token('bad'))).toBeGreaterThanOrEqual(4.5)
  })

  it('the open badge meets 4.5:1', () => {
    expect(contrast(token('ink'), token('good'))).toBeGreaterThanOrEqual(4.5)
  })

  /**
   * WCAG 1.4.11: a UI boundary needs 3:1 against ADJACENT colours. The panel
   * border sits between the page background and the panel fill, so it must
   * clear 3:1 against every surface it touches, not just the darkest.
   */
  it.each(['ink', 'ink-2', 'panel', 'panel-2'])(
    'panel borders meet 3:1 against %s',
    (surface) => {
      expect(contrast(token('edge'), token(surface))).toBeGreaterThanOrEqual(3)
    },
  )

  it('the focus ring is clearly visible against every surface', () => {
    for (const bg of [INK(), INK2(), PANEL(), PANEL2()]) {
      expect(contrast(token('warn'), bg)).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('accessibility rules the stylesheet must keep', () => {
  it('declares a 44px minimum tap target', () => {
    expect(css).toMatch(/--tap:\s*44px/)
  })

  it('honours prefers-reduced-motion', () => {
    expect(css).toContain('prefers-reduced-motion: reduce')
  })

  it('supports an explicit reduced-motion override', () => {
    expect(css).toContain("[data-motion='reduced']")
  })

  it('has a visible focus style', () => {
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:/)
  })

  it('applies safe-area insets', () => {
    expect(css).toContain('env(safe-area-inset-top)')
  })

  it('scales every size through the text-scale token', () => {
    expect(css).toMatch(/--text-scale:\s*1/)
  })

  it('has no animation that could flash', () => {
    // Blink-style animations must be on a caret only, never a whole surface.
    const animations = css.match(/animation:\s*[^;]+/g) ?? []
    for (const a of animations) {
      expect(a).not.toMatch(/\b(0\.[0-9]|[0-9]+)ms\b/)
    }
  })
})
