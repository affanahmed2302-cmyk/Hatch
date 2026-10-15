/** Light UI sound effects — Web Audio, no asset files */

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === "suspended") void ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function blip(freq: number, ms: number, vol = 0.06, type: OscillatorType = "sine") {
  const c = ac()
  if (!c) return
  const t = c.currentTime
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000)
  o.connect(g)
  g.connect(c.destination)
  o.start(t)
  o.stop(t + ms / 1000 + 0.02)
}

export function soundTap() {
  blip(640, 40, 0.04, "triangle")
}

export function soundSend() {
  blip(720, 50, 0.05, "sine")
  blip(980, 60, 0.035, "sine")
}

export function soundSuccess() {
  blip(523, 80, 0.05, "sine")
  blip(784, 100, 0.06, "triangle")
}

export function soundPing() {
  blip(880, 70, 0.07, "sine")
  blip(1175, 90, 0.05, "triangle")
}

export function soundError() {
  blip(180, 120, 0.05, "sawtooth")
}
