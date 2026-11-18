// Sound and vibration shared by every game.
// Sound is off until the player turns it on (people play in queues and classes);
// the setting is remembered across games. Vibration is a short tick where the
// phone supports it (Android browsers; iPhones ignore it).
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
export function tone(hz: number, ms = 120, opts: { type?: OscillatorType; volume?: number; force?: boolean; at?: number } = {}) {
  if (!opts.force && !soundOn()) return
  const a = audio()
  if (!a) return
  const t = a.currentTime + (opts.at ?? 0)
  const vol = opts.volume ?? 0.12
  const osc = a.createOscillator()
  const gain = a.createGain()
  osc.type = opts.type ?? 'sine'
  osc.frequency.value = hz
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(vol, t + 0.01)
  gain.gain.setValueAtTime(vol, t + Math.max(0.02, ms / 1000 - 0.04))
  gain.gain.linearRampToValueAtTime(0, t + ms / 1000)
  osc.connect(gain).connect(a.destination)
  osc.start(t)
  osc.stop(t + ms / 1000 + 0.02)
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
}
