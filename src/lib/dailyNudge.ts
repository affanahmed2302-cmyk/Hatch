import { ensureNotifyPermission, notifyUser } from './notify'

const KEY = 'hatch_daily_nudge_day'
const HOUR_KEY = 'hatch_peak_hour'

export function getPeakHour(): number {
  try {
    const h = parseInt(localStorage.getItem(HOUR_KEY) || '18', 10)
    return h === 16 || h === 18 ? h : 18
  } catch {
    return 18
  }
}

export function setPeakHour(h: 16 | 18) {
  try {
    localStorage.setItem(HOUR_KEY, String(h))
  } catch { /* */ }
}

export async function maybeDailyPeakNudge() {
  if (typeof window === 'undefined') return
  try {
    const perm = await ensureNotifyPermission()
    if (perm !== 'granted') return

    const now = new Date()
    const hour = now.getHours()
    const peak = getPeakHour()
    if (hour < peak || hour > peak + 2) return

    const day = now.toISOString().slice(0, 10)
    if (localStorage.getItem(KEY) === day) return
    localStorage.setItem(KEY, day)

    notifyUser(
      'Hatch · campus peak',
      hour === peak
        ? "People are free now — open I'm Free or drop a Pulse"
        : "Catch up on campus — Lounge, I'm Free, or Sparks",
      { url: '/home', tag: 'hatch-daily' }
    )
  } catch { /* */ }
}
