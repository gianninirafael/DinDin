// Soft tactile feedback for taps: a gentle synthesized click by default,
// plus optional custom sound files (see CUSTOM_SOUNDS below) and a light haptic.
// Everything is local; nothing is loaded from the network.

type SoundName = 'click' | 'confirm'

// --- Custom sounds (optional) ---------------------------------------------
// To use your own sounds later: drop files in `public/sounds/` (e.g.
// click.mp3, confirm.mp3) and point these at them, e.g.
//   click: `${import.meta.env.BASE_URL}sounds/click.mp3`
// Leave a value null to keep the built-in synthesized sound for that event.
const CUSTOM_SOUNDS: Record<SoundName, string | null> = {
  click: null,
  confirm: null,
}

import { ns } from './ns'

const SETTING_KEY = ns('sound')

export function isSoundOn(): boolean {
  try {
    return localStorage.getItem(SETTING_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setSoundOn(on: boolean): void {
  try {
    localStorage.setItem(SETTING_KEY, on ? 'on' : 'off')
  } catch {
    // ignore storage failures
  }
}

let ctx: AudioContext | null = null
function audioCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      ctx = new AC()
    }
    // iOS/Safari start suspended until a user gesture resumes them
    if (ctx.state === 'suspended') void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

const audioCache = new Map<string, HTMLAudioElement>()
function playFile(url: string, volume: number) {
  let base = audioCache.get(url)
  if (!base) {
    base = new Audio(url)
    base.preload = 'auto'
    audioCache.set(url, base)
  }
  // clone so rapid taps can overlap
  const a = base.cloneNode() as HTMLAudioElement
  a.volume = volume
  void a.play().catch(() => {})
}

// A short, soft click built from a quick pitch drop with a fast decay.
function synthClick(freq: number, peak: number, durationMs: number) {
  const ac = audioCtx()
  if (!ac) return
  const now = ac.currentTime
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(freq, now)
  osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + durationMs / 1000)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(peak, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000)
  osc.connect(gain).connect(ac.destination)
  osc.start(now)
  osc.stop(now + durationMs / 1000 + 0.02)
}

function haptic(ms: number) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    // not supported — ignore
  }
}

/** Soft click for taps (keypad, category, tabs). */
export function playClick(): void {
  if (!isSoundOn()) return
  if (CUSTOM_SOUNDS.click) playFile(CUSTOM_SOUNDS.click, 0.5)
  else synthClick(200, 0.05, 55)
  haptic(6)
}

/** Slightly warmer two-tone confirmation for a successful save. */
export function playConfirm(): void {
  if (!isSoundOn()) return
  if (CUSTOM_SOUNDS.confirm) {
    playFile(CUSTOM_SOUNDS.confirm, 0.6)
  } else {
    synthClick(320, 0.06, 70)
    setTimeout(() => synthClick(480, 0.05, 90), 60)
  }
  haptic(12)
}
