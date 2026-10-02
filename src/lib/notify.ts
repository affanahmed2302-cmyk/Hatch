/** Browser + in-app alerts (works when PWA is open / installed) */

export async function ensureNotifyPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function notifyUser(title: string, body: string, opts?: { url?: string; tag?: string }) {
  if (typeof window === "undefined") return;
  try {
    if ("Notification" in window && Notification.permission === "granted") {
      const n = new Notification(title, {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: opts?.tag || "hatch",
        requireInteraction: true,
      });
      n.onclick = () => {
        window.focus();
        if (opts?.url) window.location.href = opts.url;
        n.close();
      };
    }
  } catch { /* ignore */ }

  try {
    if (navigator.vibrate) navigator.vibrate([40, 30, 40, 30, 80]);
  } catch { /* ignore */ }

  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 880;
    g.gain.value = 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    o.stop(ctx.currentTime + 0.4);
  } catch { /* ignore */ }
}

/** Icebreakers adapt to peer + wherever they are free (Library, Canteen, Quad, etc.) */
export function campusIcebreakers(peer: {
  full_name?: string | null
  department?: string | null
  intent?: string | null
  career_goal?: string | null
  year?: number | null
}, freePlace?: string | null): string[] {
  const name = (peer.full_name || "").split(" ")[0] || "there";
  const dept = peer.department || "campus";
  const intent = peer.intent || peer.career_goal || "a project";
  const lines: string[] = [];

  if (freePlace) {
    lines.push(`Hey ${name} — saw you're at ${freePlace}. Mind if I join in 10 mins?`);
    lines.push(`I'm around campus — want to meet at ${freePlace}?`);
    lines.push(`Ping from Hatch — free near ${freePlace}? Quick chat?`);
  }

  lines.push(`Hi ${name}! ${dept} here — free for a quick chat about ${intent}?`);
  lines.push(`Hey — looking for a study / lab buddy this week. You free?`);
  lines.push(`Hi! What's one thing you're working on right now?`);
  if (!freePlace) {
    lines.push(`Where do you usually hang on campus — library, canteen, or elsewhere?`);
  }

  return lines.slice(0, 5);
}
