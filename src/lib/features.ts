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
  // Circles = feature_sparks only (no dual AND with dating_app_active)
  // dating_app_active kept as alias for admin UI compatibility
  out.dating_app_active = out.feature_sparks
  return out
}

export async function isFeatureOn(key: FeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags()
  if (key === 'dating_app_active') return !!flags.feature_sparks
  return !!flags[key]
}

/** Internal flag — UI never says "dating" */
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

/** Configurable window — default 22:00–05:00 local browser time (Asia/Kolkata for BMSCE users) */
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
  // Use Asia/Kolkata hour for BMSCE (configurable later via TZ setting)
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
