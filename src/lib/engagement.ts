import { supabase } from './supabase'

const VIBE_OPTIONS = [
  { id: 'allnighter', label: 'All-nighter' },
  { id: 'library', label: 'In library' },
  { id: 'chilling', label: 'Chilling' },
  { id: 'placements', label: 'Placements grind' },
  { id: 'hungover', label: 'Need chai' },
] as const

export { VIBE_OPTIONS }

export async function voteVibe(userId: string, choice: string) {
  try {
    const day = new Date().toLocaleDateString('en-CA')
    const { error } = await supabase.from('vibe_checks').upsert(
      { user_id: userId, day, choice },
      { onConflict: 'user_id,day' }
    )
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Vote failed' }
  }
}

export async function fetchVibeCounts() {
  try {
    const day = new Date().toLocaleDateString('en-CA')
    const { data } = await supabase.from('vibe_checks').select('choice').eq('day', day)
    const counts: Record<string, number> = {}
    for (const row of data || []) {
      counts[row.choice] = (counts[row.choice] || 0) + 1
    }
    return counts
  } catch {
    return {}
  }
}

export async function setStudyBeacon(userId: string, place: string, note?: string) {
  try {
    await supabase.from('study_beacons').delete().eq('user_id', userId)
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { error } = await supabase.from('study_beacons').insert({
      user_id: userId,
      place,
      note: note || null,
      expires_at: expires,
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Beacon failed' }
  }
}

export async function fetchStudyBeacons() {
  try {
    const { data } = await supabase
      .from('study_beacons')
      .select('id, user_id, place, note, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    if (!data?.length) return []
    const ids = data.map((d) => d.user_id)
    const { data: profs } = await supabase.from('profiles').select('id, full_name, username, avatar_url').in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return data.map((d) => ({ ...d, profile: map[d.user_id] }))
  } catch {
    return []
  }
}

export async function postBounty(userId: string, title: string, rewardInr: number) {
  try {
    const t = title.trim()
    if (t.length < 4) return { ok: false as const, error: 'Title too short' }
    const { error } = await supabase.from('micro_bounties').insert({
      user_id: userId,
      title: t.slice(0, 120),
      reward_inr: Math.max(0, Math.min(5000, rewardInr || 0)),
      status: 'open',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Post failed' }
  }
}

export async function fetchBounties() {
  try {
    const { data } = await supabase
      .from('micro_bounties')
      .select('id, user_id, title, reward_inr, status, expires_at, created_at')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(15)
    return data || []
  } catch {
    return []
  }
}

/** Daily open streak on profiles */
export async function bumpOpenStreak(userId: string): Promise<number> {
  try {
    const today = new Date().toLocaleDateString('en-CA')
    const { data } = await supabase
      .from('profiles')
      .select('open_streak, last_open_date')
      .eq('id', userId)
      .maybeSingle()
    if (!data) return 0
    const last = data.last_open_date as string | null
    let streak = data.open_streak || 0
    if (last === today) return streak
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
    if (last === yesterday) streak += 1
    else streak = 1
    await supabase.from('profiles').update({ open_streak: streak, last_open_date: today }).eq('id', userId)
    return streak
  } catch {
    return 0
  }
}

export function streakTier(n: number): { label: string; emoji: string } {
  if (n >= 30) return { label: 'Legend', emoji: '🔥🔥🔥' }
  if (n >= 14) return { label: 'On fire', emoji: '🔥🔥' }
  if (n >= 7) return { label: 'Streak', emoji: '🔥' }
  if (n >= 3) return { label: 'Warming up', emoji: '✨' }
  return { label: 'Start', emoji: '🌱' }
}

export async function fetchCollegeLeaderboard(limit = 15) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('college_pod, rep_score')
      .not('college_pod', 'is', null)
      .limit(500)
    const map: Record<string, number> = {}
    for (const row of data || []) {
      const pod = row.college_pod || 'campus'
      map[pod] = (map[pod] || 0) + (row.rep_score || 0)
    }
    return Object.entries(map)
      .map(([pod, rep]) => ({ pod, rep }))
      .sort((a, b) => b.rep - a.rep)
      .slice(0, limit)
  } catch {
    return []
  }
}

/** Soft club event countdowns (static + localStorage overrides) */
export const DEFAULT_EVENTS = [
  { id: 'utsaav', name: 'Utsav', at: '2026-11-15T10:00:00+05:30' },
  { id: 'phase', name: 'Phase Shift', at: '2026-10-20T09:00:00+05:30' },
  { id: 'hack', name: 'Campus Hack', at: '2026-10-05T18:00:00+05:30' },
]

export function eventCountdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'Live / done'
  const d = Math.floor(ms / 86400000)
  const h = Math.floor((ms % 86400000) / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (d > 0) return `${d}d ${h}h`
  return `${h}h ${m}m`
}
