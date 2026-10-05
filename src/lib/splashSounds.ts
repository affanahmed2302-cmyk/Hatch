/** Lightweight Web Audio SFX for splash — no external files */

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
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
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, c.currentTime + start);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gainPeak, c.currentTime + start + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + duration);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.05);
}

/** Logo appears — soft whoosh + warm hit */
export function playLogoIn() {
  const c = getCtx();
  if (!c) return;
  // whoosh noise-ish via detuned saw
  tone(180, 0, 0.35, "sawtooth", 0.06);
  tone(220, 0.05, 0.28, "triangle", 0.08);
  tone(440, 0.12, 0.2, "sine", 0.1);
}

/** HATCH letters — Netflix-ish rising notes */
export function playWordReveal() {
  const c = getCtx();
  if (!c) return;
  tone(392, 0, 0.18, "sine", 0.12); // G4
  tone(494, 0.12, 0.18, "sine", 0.11); // B4
  tone(587, 0.24, 0.22, "triangle", 0.13); // D5
  tone(784, 0.4, 0.35, "sine", 0.1); // G5 resolve
}

/** Exit soft click */
export function playOut() {
  tone(520, 0, 0.12, "sine", 0.05);
  tone(260, 0.04, 0.15, "triangle", 0.04);
}
