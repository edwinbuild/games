// Sound and vibration shared by every game.
// Sound is off until the player turns it on (people play in queues and classes);
// the setting is remembered across games. Vibration is a short tick where the
// phone supports it (Android browsers; iPhones ignore it).
import { chimeHz, popHz } from './pitch'
import { load, save } from './storage'

type Listener = (on: boolean) => void
const listeners = new Set<Listener>()

export function soundOn(): boolean {
  return load<boolean>('sound', false)
}

export function setSound(on: boolean): void {
  save('sound', on)
  listeners.forEach((l) => l(on))
  if (on) feel.tap()
}

export function onSoundChange(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

function vibrate(pattern: number | number[]) {
  try {
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(pattern)
  } catch {
    /* not supported */
  }
}

let ctx: AudioContext | null = null
function audio(): AudioContext | null {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

/** A short tone. `force` plays even with sound off (for games where sound is the game). */
export function tone(hz: number, ms = 120, opts: { type?: OscillatorType; volume?: number; force?: boolean; at?: number; to?: number } = {}) {
  if (!opts.force && !soundOn()) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + (opts.at ?? 0)
  const vol = opts.volume ?? 0.12
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.setValueAtTime(hz, t)
  if (opts.to) osc.frequency.exponentialRampToValueAtTime(opts.to, t + ms / 1000)
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.setValueAtTime(vol, t + Math.max(0.02, ms / 1000 - 0.04))
  gain.gain.linearRampToValueAtTime(0, t + ms / 1000)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + ms / 1000 + 0.02)
}

let pourNodes: { src: AudioBufferSourceNode; gain: GainNode } | null = null
/** A soft running-liquid sound: filtered noise that fades in while `on` and out when stopped. */
function pour(on: boolean) {
  const a = audio()
  if (!a) return
  if (on && soundOn() && !pourNodes) {
    const buf = a.createBuffer(1, a.sampleRate * 2, a.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    const src = a.createBufferSource()
    src.buffer = buf
    src.loop = true
    const band = a.createBiquadFilter()
    band.type = 'bandpass'
    band.frequency.value = 900
    band.Q.value = 0.8
    const gain = a.createGain()
    gain.gain.setValueAtTime(0, a.currentTime)
    gain.gain.linearRampToValueAtTime(0.06, a.currentTime + 0.08)
    src.connect(band).connect(gain).connect(a.destination)
    src.start()
    pourNodes = { src, gain }
  } else if (!on && pourNodes) {
    const { src, gain } = pourNodes
    pourNodes = null
    gain.gain.cancelScheduledValues(a.currentTime)
    gain.gain.setValueAtTime(gain.gain.value, a.currentTime)
    gain.gain.linearRampToValueAtTime(0, a.currentTime + 0.15)
    src.stop(a.currentTime + 0.2)
  }
}

/** The small set of feedback sounds every game uses, so they feel like one site. */
export const feel = {
  /** A key or cell was pressed. */
  tap() {
    vibrate(8)
    tone(520, 35, { type: 'triangle', volume: 0.08 })
  },
  /** A correct move. */
  good() {
    vibrate(12)
    tone(784, 70, { type: 'triangle' })
  },
  /** A mistake. */
  bad() {
    vibrate([25, 40, 25])
    tone(160, 180, { type: 'square', volume: 0.05 })
  },
  /** The game is over and the ticket prints. */
  done() {
    vibrate([10, 60, 20])
    tone(523, 90, { type: 'triangle' })
    tone(659, 90, { type: 'triangle', at: 0.09 })
    tone(784, 160, { type: 'triangle', at: 0.18 })
  },

  // Satisfying games: sounds that reward a single action, and pitch that climbs with a chain.
  /** The nth pop in a chain (0-based); pitch climbs with n. */
  pop(n = 0) {
    vibrate(6)
    const hz = popHz(n)
    tone(hz * 1.5, 60, { type: 'sine', volume: 0.1, to: hz })
  },
  /** The nth success in a row (0-based), climbing a pentatonic scale. */
  chime(n = 0) {
    const hz = chimeHz(n)
    tone(hz, 180, { type: 'sine', volume: 0.1 })
    tone(hz * 2, 140, { type: 'sine', volume: 0.03 })
  },
  /** Liquid running while `on`. */
  pour,
  /** A piece snapping into place, or the ticket printing. */
  click() {
    tone(2200, 14, { type: 'square', volume: 0.04, to: 1400 })
  },
  /** Something landing. */
  thud() {
    tone(140, 120, { type: 'sine', volume: 0.16, to: 60 })
  },
  /** Named vibrations, so games don't invent their own patterns. */
  light() { vibrate(6) },
  medium() { vibrate(14) },
  success() { vibrate([12, 50, 24]) },
}
