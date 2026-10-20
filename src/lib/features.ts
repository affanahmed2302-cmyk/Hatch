import { supabase, isSuperAdmin } from './supabase'

export type FeatureKey =
  | 'feature_sparks'
  | 'dating_app_active'
  | 'feature_confessions'
  | 'feature_club_portal'
  | 'feature_bounties'
  | 'feature_lounge'
  | 'feature_premium'
  | 'feature_ecosystem'
  | 'feature_club_events'
  | 'maintenance_mode'

/** Circles (feature_sparks) OFF by default until founder enables in Pilot */
const DEFAULTS: Record<FeatureKey, boolean> = {
  feature_sparks: false,
  dating_app_active: false,
  feature_confessions: true,
  feature_club_portal: true,
  feature_bounties: true,
  feature_lounge: true,
  feature_premium: true,
  feature_ecosystem: true,
  feature_club_events: true,
  maintenance_mode: false,
}

export async function getFeatureFlags(): Promise<Record<FeatureKey, boolean>> {
  const out = { ...DEFAULTS }
  try {
    const { data } = await supabase.from('app_settings').select('key, value')
    for (const row of data || []) {
      if (row.key in out) {
        out[row.key as FeatureKey] = String(row.value).toLowerCase() === 'true'
      }
    }
  } catch {
    /* missing table → defaults */
  }
  out.dating_app_active = out.feature_sparks
  return out
}

export async function isFeatureOn(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags()
  if (key === 'dating_app_active') return !!flags.feature_sparks
  return !!flags[key]
}

export async function isDatingAppActive(): Promise<boolean> {
  return isFeatureOn('feature_sparks')
}

export async function isCirclesActive(): Promise<boolean> {
  return isFeatureOn('feature_sparks')
}

export async function isClubPortalActive(): Promise<boolean> {
  return isFeatureOn('feature_club_portal')
}

export async function setFeatureFlag(
  key: FeatureKey,
  enabled: boolean,
  adminEmail?: string | null,
  _adminId?: string | null
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  try {
    const keys: FeatureKey[] =
      key === 'feature_sparks' || key === 'dating_app_active'
        ? ['feature_sparks', 'dating_app_active']
        : [key]

    for (const k of keys) {
      const { error } = await supabase.from('app_settings').upsert(
        {
          key: k,
          value: enabled ? 'true' : 'false',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      if (error) return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function getConfessionWindow(): Promise<{ start: number; end: number }> {
  let start = 22
  let end = 5
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['confession_window_start', 'confession_window_end'])
    for (const row of data || []) {
      const n = parseInt(String(row.value), 10)
      if (Number.isNaN(n) || n < 0 || n > 23) continue
      if (row.key === 'confession_window_start') start = n
      if (row.key === 'confession_window_end') end = n
    }
  } catch {
    /* defaults 22–5 */
  }
  return { start, end }
}

export async function setConfessionWindow(
  start: number,
  end: number,
  adminEmail?: string | null,
  _adminId?: string | null
) {
  if (!isSuperAdmin(adminEmail)) return { ok: false as const, error: 'Super-admin only' }
  const s = Math.max(0, Math.min(23, start))
  const e = Math.max(0, Math.min(23, end))
  try {
    for (const [key, value] of [
      ['confession_window_start', String(s)],
      ['confession_window_end', String(e)],
    ] as const) {
      const { error } = await supabase.from('app_settings').upsert(
        {
          key,
          value,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )
      if (error) return { ok: false as const, error: error.message }
    }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function isConfessionOpenNow(): Promise<boolean> {
  if (!(await isFeatureOn('feature_confessions'))) return false
  const { start, end } = await getConfessionWindow()
  const h = Number(
    new Intl.DateTimeFormat('en-IN', {
      hour: 'numeric',
      hour12: false,
      timeZone: 'Asia/Kolkata',
    }).format(new Date())
  )
  if (start === end) return true
  if (start < end) return h >= start && h < end
  return h >= start || h < end
}

export function formatWindowLabel(start: number, end: number): string {
  const fmt = (n: number) => {
    const h = n % 12 || 12
    const ap = n < 12 ? 'am' : 'pm'
    return `${h}${ap}`
  }
  return `${fmt(start)}–${fmt(end)} IST`
}

/** Admin metrics — soft counts; never throws */
export async function fetchAdminMetrics() {
  try {
    const [{ count: users }, { count: reports }] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }),
    ])
    return {
      users: users || 0,
      reports: reports || 0,
      activeToday: 0,
      messages24h: 0,
    }
  } catch {
    return { users: 0, reports: 0, activeToday: 0, messages24h: 0 }
  }
}

export async function fetchAdminReports(limit = 20) {
  try {
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  } catch {
    return []
  }
}

/** Lightweight product advice for pilot/admin */
export function assistantCeoAdvice(metrics?: {
  users?: number
  reports?: number
  activeToday?: number
}): string[] {
  const tips: string[] = []
  const u = metrics?.users ?? 0
  const r = metrics?.reports ?? 0
  if (u < 50) tips.push("Push campus launch: clubs + I'm Free on Home.")
  else tips.push('Users growing — keep confessions window tight and leaderboard visible.')
  if (r > 5) tips.push('Review reports in Safety — block abusers fast.')
  tips.push('Keep Google OAuth + college email gate working before marketing.')
  tips.push('Circles/Sparks stays OFF until officially approved.')
  return tips
}
