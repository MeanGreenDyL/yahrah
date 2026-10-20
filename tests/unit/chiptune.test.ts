import { describe, it, expect, beforeEach } from 'vitest'
import { ChiptuneEngine } from '@/audio/chiptune'

/**
 * The critical guarantee: nothing audible, and no AudioContext at all,
 * until audio is explicitly enabled. jsdom has no Web Audio, so these
 * tests install a minimal fake and assert on what the engine does with it.
 */

let constructed = 0

class FakeParam {
  value = 0
  setValueAtTime() {
    return this
  }
  exponentialRampToValueAtTime() {
    return this
  }
}

class FakeNode {
  connect() {
    return this
  }
  disconnect() {
    return this
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam()
}

class FakeSource extends FakeNode {
  started = false
  stopped = false
  onended: (() => void) | null = null
  frequency = new FakeParam()
  type = 'square'
  buffer: unknown = null
  start() {
    this.started = true
  }
  stop() {
    this.stopped = true
  }
}

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  sampleRate = 44100
  destination = new FakeNode()
  closed = false
  sources: FakeSource[] = []

  constructor() {
    constructed++
  }
  createGain() {
    return new FakeGain() as unknown as GainNode
  }
  createOscillator() {
    const s = new FakeSource()
    this.sources.push(s)
    return s as unknown as OscillatorNode
  }
  createBufferSource() {
    const s = new FakeSource()
    this.sources.push(s)
    return s as unknown as AudioBufferSourceNode
  }
  createBuffer(_ch: number, frames: number) {
    const data = new Float32Array(frames)
    return { getChannelData: () => data } as unknown as AudioBuffer
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    this.closed = true
    return Promise.resolve()
  }
}

beforeEach(() => {
  constructed = 0
  ;(window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext
})

describe('ChiptuneEngine', () => {
  it('is disabled by default', () => {
    expect(new ChiptuneEngine().isEnabled()).toBe(false)
  })

  it('creates no AudioContext while disabled, even when asked to play', () => {
    const engine = new ChiptuneEngine()
    engine.play('confirm')
    engine.play('levelup')
    expect(constructed).toBe(0)
    expect(engine.hasContext()).toBe(false)
  })

  it('still creates no context merely from being enabled', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    expect(constructed).toBe(0)
    expect(engine.hasContext()).toBe(false)
  })

  it('creates the context on the first sound after being enabled', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    engine.play('confirm')
    expect(constructed).toBe(1)
    expect(engine.hasContext()).toBe(true)
  })

  it('reuses one context across many sounds', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    engine.play('select')
    engine.play('hit')
    engine.play('catch')
    expect(constructed).toBe(1)
  })

  it('starts a source per audible note', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    engine.playNotes(
      [
        { pitch: 0, beats: 0.1 },
        { pitch: 7, beats: 0.1 },
        { pitch: null, beats: 0.1 }, // a rest makes no source
        { pitch: 12, beats: 0.1 },
      ],
      1,
    )
    const ctx = (engine as unknown as { ctx: FakeAudioContext }).ctx
    expect(ctx.sources.length).toBe(3)
    expect(ctx.sources.every((s) => s.started)).toBe(true)
  })

  it('supports a noise waveform for percussive hits', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    engine.playNotes([{ pitch: 0, beats: 0.05, wave: 'noise' }], 1)
    const ctx = (engine as unknown as { ctx: FakeAudioContext }).ctx
    expect(ctx.sources.length).toBe(1)
  })

  it('disabling stops every sounding source and closes the context', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    engine.play('levelup')
    const ctx = (engine as unknown as { ctx: FakeAudioContext }).ctx
    expect(ctx.sources.length).toBeGreaterThan(0)

    engine.setEnabled(false)
    expect(ctx.sources.every((s) => s.stopped)).toBe(true)
    expect(ctx.closed).toBe(true)
    expect(engine.hasContext()).toBe(false)
  })

  it('goes quiet again after being re-disabled', () => {
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    engine.play('confirm')
    engine.setEnabled(false)
    constructed = 0
    engine.play('confirm')
    expect(constructed).toBe(0)
  })

  it('survives an environment with no Web Audio at all', () => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext
    const engine = new ChiptuneEngine()
    engine.setEnabled(true)
    expect(() => engine.play('confirm')).not.toThrow()
    expect(engine.hasContext()).toBe(false)
  })

  it('clamps volume into range', () => {
    const engine = new ChiptuneEngine()
    engine.setVolume(5)
    engine.setVolume(-2)
    expect(() => engine.setVolume(0.5)).not.toThrow()
  })
})
