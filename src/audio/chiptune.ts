/**
 * Chiptune engine. Everything is synthesised with the Web Audio API at
 * runtime - there are no audio files in this project, sampled or otherwise.
 *
 * Rules this module enforces:
 *  - Audio is OFF until explicitly enabled. Nothing is created before then.
 *  - The AudioContext is built lazily, on the first enabled sound, because
 *    browsers refuse to start one outside a user gesture.
 *  - Disabling stops everything and releases the context.
 */

export type Waveform = 'square' | 'triangle' | 'sawtooth' | 'noise'

export type Note = {
  /** Semitone offset from A4 (440 Hz). Null is a rest. */
  pitch: number | null
  /** Duration in beats. */
  beats: number
  wave?: Waveform
  /** 0..1, before the master gain. */
  gain?: number
}

export type Sfx = 'select' | 'confirm' | 'cancel' | 'hit' | 'hurt' | 'catch' | 'levelup' | 'error'

/** Equal temperament around A4. */
function hz(semitonesFromA4: number): number {
  return 440 * Math.pow(2, semitonesFromA4 / 12)
}

/** Short effects, written as note runs. Deliberately terse and punchy. */
const SFX: Record<Sfx, Note[]> = {
  select: [{ pitch: 7, beats: 0.06, wave: 'square', gain: 0.22 }],
  confirm: [
    { pitch: 7, beats: 0.06, wave: 'square', gain: 0.26 },
    { pitch: 14, beats: 0.1, wave: 'square', gain: 0.26 },
  ],
  cancel: [
    { pitch: 2, beats: 0.06, wave: 'square', gain: 0.22 },
    { pitch: -5, beats: 0.1, wave: 'square', gain: 0.22 },
  ],
  hit: [
    { pitch: 12, beats: 0.04, wave: 'square', gain: 0.3 },
    { pitch: 5, beats: 0.08, wave: 'noise', gain: 0.18 },
  ],
  hurt: [
    { pitch: -3, beats: 0.05, wave: 'sawtooth', gain: 0.26 },
    { pitch: -10, beats: 0.14, wave: 'sawtooth', gain: 0.26 },
  ],
  catch: [
    { pitch: 0, beats: 0.07, wave: 'square', gain: 0.24 },
    { pitch: 7, beats: 0.07, wave: 'square', gain: 0.24 },
    { pitch: 12, beats: 0.07, wave: 'square', gain: 0.24 },
    { pitch: 19, beats: 0.18, wave: 'triangle', gain: 0.26 },
  ],
  levelup: [
    { pitch: 0, beats: 0.08, wave: 'square', gain: 0.26 },
    { pitch: 4, beats: 0.08, wave: 'square', gain: 0.26 },
    { pitch: 7, beats: 0.08, wave: 'square', gain: 0.26 },
    { pitch: 12, beats: 0.1, wave: 'square', gain: 0.28 },
    { pitch: 16, beats: 0.26, wave: 'triangle', gain: 0.3 },
  ],
  error: [
    { pitch: -8, beats: 0.1, wave: 'square', gain: 0.24 },
    { pitch: -9, beats: 0.2, wave: 'square', gain: 0.24 },
  ],
}

type Ctx = AudioContext & { yahrahMaster?: GainNode }

export class ChiptuneEngine {
  private ctx: Ctx | null = null
  private master: GainNode | null = null
  private enabled = false
  private volume = 0.5
  /** Nodes currently sounding, so disable() can silence them immediately. */
  private active = new Set<AudioScheduledSourceNode>()

  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Turn audio on or off. Enabling does not create the context on its own -
   * that happens on the first sound, which should come from a user gesture.
   */
  setEnabled(on: boolean): void {
    this.enabled = on
    if (!on) this.stopAll()
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v))
    if (this.master && this.ctx) {
      this.master.gain.setValueAtTime(this.volume, this.ctx.currentTime)
    }
  }

  /** True once an AudioContext actually exists. Used by tests. */
  hasContext(): boolean {
    return this.ctx !== null
  }

  private ensureContext(): Ctx | null {
    if (!this.enabled) return null
    if (this.ctx) return this.ctx

    const Ctor =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined
    if (!Ctor) return null

    try {
      const ctx = new Ctor() as Ctx
      const master = ctx.createGain()
      master.gain.setValueAtTime(this.volume, ctx.currentTime)
      master.connect(ctx.destination)
      this.ctx = ctx
      this.master = master
      return ctx
    } catch {
      return null
    }
  }

  /** A short burst of filtered white noise, for percussive hits. */
  private noiseSource(ctx: Ctx, seconds: number): AudioBufferSourceNode {
    const frames = Math.max(1, Math.floor(ctx.sampleRate * seconds))
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
    const src = ctx.createBufferSource()
    src.buffer = buffer
    return src
  }

  private scheduleNote(ctx: Ctx, note: Note, at: number, secondsPerBeat: number): number {
    const duration = note.beats * secondsPerBeat
    if (note.pitch === null || !this.master) return duration

    const gain = ctx.createGain()
    const peak = note.gain ?? 0.25
    // A tight attack and exponential decay is most of the chiptune character.
    gain.gain.setValueAtTime(0.0001, at)
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.005)
    gain.gain.exponentialRampToValueAtTime(0.0001, at + Math.max(0.02, duration))
    gain.connect(this.master)

    let source: AudioScheduledSourceNode
    if (note.wave === 'noise') {
      source = this.noiseSource(ctx, Math.max(0.02, duration))
    } else {
      const osc = ctx.createOscillator()
      osc.type = note.wave ?? 'square'
      osc.frequency.setValueAtTime(hz(note.pitch), at)
      source = osc
    }

    source.connect(gain)
    source.start(at)
    source.stop(at + Math.max(0.02, duration) + 0.02)

    this.active.add(source)
    source.onended = () => {
      this.active.delete(source)
      try {
        source.disconnect()
        gain.disconnect()
      } catch {
        // already torn down
      }
    }

    return duration
  }

  /** Play a named effect. A no-op when audio is disabled. */
  play(name: Sfx): void {
    this.playNotes(SFX[name], 1)
  }

  /** Play an arbitrary note run. `tempo` is beats per second. */
  playNotes(notes: Note[], tempo = 1): void {
    const ctx = this.ensureContext()
    if (!ctx) return

    // A context created before a gesture can start suspended.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})

    const secondsPerBeat = 1 / tempo
    let at = ctx.currentTime + 0.01
    for (const note of notes) {
      at += this.scheduleNote(ctx, note, at, secondsPerBeat)
    }
  }

  stopAll(): void {
    for (const source of this.active) {
      try {
        source.stop()
      } catch {
        // already stopped
      }
    }
    this.active.clear()
    if (this.ctx) {
      void this.ctx.close().catch(() => {})
      this.ctx = null
      this.master = null
    }
  }
}

/** The one engine the app uses. */
export const chiptune = new ChiptuneEngine()
