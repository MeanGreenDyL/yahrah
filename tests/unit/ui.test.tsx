import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Menu } from '@/ui/Menu'
import { Meter } from '@/ui/Meter'
import { Sprite } from '@/ui/Sprite'
import { CREST } from '@/ui/crest'

afterEach(cleanup)

const items = [
  { id: 'one', label: 'One' },
  { id: 'two', label: 'Two' },
  { id: 'locked', label: 'Locked', disabled: true },
  { id: 'three', label: 'Three' },
]

describe('Menu', () => {
  it('marks exactly one row as the cursor', () => {
    render(<Menu label="Test" items={items} onSelect={() => {}} />)
    expect(document.querySelectorAll('.menu-item-active')).toHaveLength(1)
  })

  it('shows no cursor at all when inactive', () => {
    render(<Menu label="Test" items={items} onSelect={() => {}} active={false} />)
    expect(document.querySelectorAll('.menu-item-active')).toHaveLength(0)
  })

  it('ignores the keyboard when inactive', () => {
    const onSelect = vi.fn()
    render(<Menu label="Test" items={items} onSelect={onSelect} active={false} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('selects the first item on Enter', () => {
    const onSelect = vi.fn()
    render(<Menu label="Test" items={items} onSelect={onSelect} />)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('one')
  })

  it('skips disabled rows when moving the cursor', () => {
    const onSelect = vi.fn()
    render(<Menu label="Test" items={items} onSelect={onSelect} />)
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    // 'locked' is disabled, so the third enabled row is 'three'.
    expect(onSelect).toHaveBeenCalledWith('three')
  })

  it('handles two keypresses in the same frame without a stale cursor', () => {
    const onSelect = vi.fn()
    render(<Menu label="Test" items={items} onSelect={onSelect} />)
    // No re-render between these two: the cursor must be read from a ref.
    fireEvent.keyDown(window, { key: 'ArrowDown' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('two')
  })

  it('wraps around at both ends', () => {
    const onSelect = vi.fn()
    render(<Menu label="Test" items={items} onSelect={onSelect} />)
    fireEvent.keyDown(window, { key: 'ArrowUp' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('three')
  })

  it('accepts WASD as well as arrows', () => {
    const onSelect = vi.fn()
    render(<Menu label="Test" items={items} onSelect={onSelect} />)
    fireEvent.keyDown(window, { key: 's' })
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('two')
  })

  it('calls onCancel for Escape', () => {
    const onCancel = vi.fn()
    render(<Menu label="Test" items={items} onSelect={() => {}} onCancel={onCancel} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalled()
  })

  it('renders disabled rows as disabled buttons', () => {
    render(<Menu label="Test" items={items} onSelect={() => {}} />)
    expect(screen.getByRole('menuitem', { name: /Locked/ })).toBeDisabled()
  })
})

describe('Meter', () => {
  it('exposes progressbar semantics', () => {
    render(<Meter label="Experience" value={30} max={120} />)
    const bar = screen.getByRole('progressbar', { name: 'Experience' })
    expect(bar).toHaveAttribute('aria-valuenow', '30')
    expect(bar).toHaveAttribute('aria-valuemax', '120')
  })

  it('fills the right number of segments', () => {
    const { container } = render(<Meter label="XP" value={50} max={100} segments={20} />)
    expect(container.querySelectorAll('.seg-on')).toHaveLength(10)
  })

  it('never divides by zero', () => {
    const { container } = render(<Meter label="XP" value={0} max={0} segments={10} />)
    expect(container.querySelectorAll('.seg-on')).toHaveLength(0)
  })

  it('clamps an over-full value', () => {
    const { container } = render(<Meter label="XP" value={999} max={100} segments={10} />)
    expect(container.querySelectorAll('.seg-on')).toHaveLength(10)
  })
})

describe('Sprite', () => {
  beforeEach(() => {
    // jsdom has no 2D context; record the fills instead.
    const calls: string[] = []
    ;(HTMLCanvasElement.prototype.getContext as unknown) = vi.fn(() => ({
      clearRect: () => {},
      fillRect: (x: number, y: number) => calls.push(`${x},${y}`),
      set fillStyle(_v: string) {},
    }))
  })

  it('sizes the canvas to the grid times the scale', () => {
    const { container } = render(<Sprite data={CREST} scale={4} label="crest" />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.width).toBe(CREST.width * 4)
    expect(canvas.height).toBe(CREST.height * 4)
  })

  it('is an image to assistive tech when labelled', () => {
    render(<Sprite data={CREST} label="The crest" />)
    expect(screen.getByRole('img', { name: 'The crest' })).toBeTruthy()
  })

  it('is hidden from assistive tech when unlabelled', () => {
    const { container } = render(<Sprite data={CREST} />)
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
  })
})
