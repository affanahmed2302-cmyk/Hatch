/** Splash music — short upbeat hook (Web Audio, no files) */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number
) {
  const c = getCtx();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 3200;
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.001, gainPeak), t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

/** Bright ascending hook — feels like app open, not a boring beep */
export function playWordReveal() {
  const c = getCtx();
  if (!c) return;
  // Chord stab
  tone(261.63, 0, 0.22, "triangle", 0.07); // C4
  tone(329.63, 0, 0.22, "sine", 0.06); // E4
  tone(392.0, 0, 0.22, "sine", 0.05); // G4
  // Rising melody
  tone(523.25, 0.12, 0.14, "sine", 0.11); // C5
  tone(659.25, 0.24, 0.14, "triangle", 0.1); // E5
  tone(783.99, 0.36, 0.16, "sine", 0.12); // G5
  tone(1046.5, 0.5, 0.28, "triangle", 0.09); // C6 sparkle
  // Soft bass under
  tone(130.81, 0, 0.45, "sine", 0.04);
}

export function playLogoIn() {
  playWordReveal();
}

export function playOut() {
  tone(880, 0, 0.08, "sine", 0.04);
  tone(1320, 0.05, 0.1, "triangle", 0.03);
}
