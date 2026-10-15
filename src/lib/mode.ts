/** Global Hatch operating mode — Professional vs Social vs Both */

export type HatchMode = 'professional' | 'social' | 'both'

export const MODE_STORAGE_KEY = 'hatch_profile_mode'

export function isValidMode(v: unknown): v is HatchMode {
  return v === 'professional' || v === 'social' || v === 'both'
}

export function readLocalMode(): HatchMode {
  if (typeof window === 'undefined') return 'both'
  try {
    const v = localStorage.getItem(MODE_STORAGE_KEY)
    if (isValidMode(v)) return v
  } catch {
    /* */
  }
  return 'both'
}

export function writeLocalMode(mode: HatchMode) {
  try {
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  } catch {
    /* */
  }
}

/** Professional feature catalog (nav / hubs) */
export const PRO_FEATURES = [
  { href: '/schedule', title: 'Smart Schedule', sub: 'Timetable + Google Calendar' },
  { href: '/attendance', title: 'Attendance margin', sub: '85% buffer calculator' },
  { href: '/vault', title: 'Classroom Vault', sub: 'PYQ · notes · labs' },
  { href: '/discover', title: 'Tech-Twin match', sub: 'Skills · teams · co-founders' },
  { href: '/tools', title: 'Placement Radar', sub: 'Internships · referrals' },
  { href: '/clubs', title: 'Clubs & leadership', sub: 'Events · proof-of-work' },
  { href: '/focus', title: 'Focus Room', sub: 'Pomodoro with peers' },
  { href: '/bounties', title: 'Bounty Board', sub: 'Campus micro-gigs' },
  { href: '/profile', title: 'Hatch Resume', sub: 'Projects · GitHub · badges' },
] as const

/** Social feature catalog — official-safe labels */
export const SOCIAL_FEATURES = [
  { href: '/home', title: "I'm Free", sub: 'Who is free on campus now' },
  { href: '/lounge', title: 'Lounge', sub: 'Open campus chat' },
  { href: '/confessions', title: 'Night notes', sub: '10pm–5am anonymous' },
  { href: '/sparks', title: 'Circles', sub: 'Meet classmates (optional)' },
  { href: '/clubs', title: 'Squad Wars', sub: 'Clout · events · hype' },
  { href: '/hostel', title: 'Hostel & flea', sub: 'Needs · marketplace' },
  { href: '/escapes', title: 'Hatch Escapes', sub: 'Weekend trip polls' },
  { href: '/inbox', title: 'Messages', sub: 'DMs · calls' },
] as const
