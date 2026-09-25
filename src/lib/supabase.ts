import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://ahtabgrlkyjjjqxvndlb.supabase.co',
  'sb_publishable_3YcwyaHxFjIcacIPNsxDWQ_IreLbFRE'
)

export const SUPER_ADMINS = ['affanahmed2302@gmail.com']

export function isSuperAdmin(email?: string | null) {
  if (!email) return false
  return SUPER_ADMINS.includes(email.toLowerCase())
}

export function isAllowedCollegeEmail(email: string): { ok: boolean; error?: string } {
  const e = (email || '').trim().toLowerCase()
  if (!e || !e.includes('@')) return { ok: false, error: 'Enter a valid email' }
  const domain = e.split('@')[1] || ''
  const blocked = ['gmail.com','googlemail.com','yahoo.com','yahoo.co.in','outlook.com','hotmail.com','live.com','icloud.com','proton.me','protonmail.com','aol.com','mail.com','yandex.com','zoho.com']
  if (blocked.includes(domain)) return { ok: false, error: 'Public emails blocked — use BMS institutional email' }
  const hasBms = domain.includes('bms')
  const okTld = domain.endsWith('.ac.in') || domain.endsWith('.edu') || domain.endsWith('.edu.in') || (domain.includes('bms') && domain.endsWith('.in'))
  if (!hasBms) return { ok: false, error: 'Use your BMS institutional email (domain must contain bms)' }
  if (!okTld) return { ok: false, error: 'Email must end with .ac.in, .edu, or college .in' }
  return { ok: true }
}

export function displayName(p: {
  full_name?: string | null
  username?: string | null
  pseudonym?: string | null
  use_pseudonym?: boolean | null
}) {
  if (p?.use_pseudonym && p?.pseudonym) return p.pseudonym
  const n = (p?.full_name || '').trim()
  if (n && n.toLowerCase() !== 'student') return n
  const u = (p?.username || '').trim()
  if (u) return '@' + u
  return 'Unnamed'
}

export function handleOf(p: { username?: string | null; full_name?: string | null }) {
  if (p?.username) return '@' + p.username
  return displayName(p)
}

export function yearToNumber(y: string | number | null | undefined): number | null {
  if (y == null || y === '') return null
  if (typeof y === 'number') return y
  const s = String(y).toLowerCase()
  if (s.includes('1')) return 1
  if (s.includes('2')) return 2
  if (s.includes('3')) return 3
  if (s.includes('4')) return 4
  const n = parseInt(s, 10)
  return Number.isFinite(n) ? n : null
}

export function yearToLabel(y: string | number | null | undefined): string {
  if (y == null || y === '') return ''
  const n = typeof y === 'number' ? y : parseInt(String(y), 10)
  if (n === 1) return '1st year'
  if (n === 2) return '2nd year'
  if (n === 3) return '3rd year'
  if (n === 4) return '4th year'
  return String(y)
}

export async function saveProfile(userId: string, fields: Record<string, unknown>) {
  try {
    const { year, full_name, username, ...rest } = fields as any
    const payload: Record<string, unknown> = { id: userId, ...rest, updated_at: new Date().toISOString() }
    if (year !== undefined) payload.year = yearToNumber(year as any)
    if (full_name !== undefined) {
      const name = String(full_name || '').trim()
      if (name.length < 2) return { ok: false as const, error: 'Display name required', data: null }
      const { data: taken } = await supabase.from('profiles').select('id').ilike('full_name', name).neq('id', userId).maybeSingle()
      if (taken) return { ok: false as const, error: 'Name already taken', data: null }
      payload.full_name = name
    }
    if (username !== undefined) {
      const uname = String(username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (uname.length < 3) return { ok: false as const, error: 'Username min 3 chars', data: null }
      const { data: takenU } = await supabase.from('profiles').select('id').eq('username', uname).neq('id', userId).maybeSingle()
      if (takenU) return { ok: false as const, error: 'Username taken', data: null }
      payload.username = uname
    }
    if (!payload.college) payload.college = 'BMS'
    const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single()
    if (error) return { ok: false as const, error: error.message, data: null }
    return { ok: true as const, error: null, data }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Save failed', data: null }
  }
}

export async function ensureProfile(userId: string, email?: string | null) {
  try {
    const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle()
    if (!data) {
      await supabase.from('profiles').upsert({
        id: userId, email: email || null, college: 'BMS', role: 'student',
        skills: [], connection_count: 0, terms_accepted: false, rep_score: 0,
      }, { onConflict: 'id' })
    }
  } catch { /* ignore */ }
}

export async function needsTermsAcceptance(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('profiles').select('terms_accepted').eq('id', userId).maybeSingle()
    return !data?.terms_accepted
  } catch { return false }
}

export async function acceptTerms(userId: string) {
  try {
    const { error } = await supabase.from('profiles').update({
      terms_accepted: true, terms_accepted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq('id', userId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export function jitsiRoom(kind: 'dm' | 'team', id: string) {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 24)
  return `hatch${kind}${clean}`
}

export function jitsiEmbedUrl(room: string, audioOnly = false, displayName = 'Hatch') {
  const params = [
    'config.prejoinPageEnabled=false',
    'config.prejoinConfig.enabled=false',
    'config.disableDeepLinking=true',
    'config.enableWelcomePage=false',
    'config.enableClosePage=false',
    'config.disableInviteFunctions=true',
    'config.requireDisplayName=false',
    'config.startWithAudioMuted=false',
    audioOnly ? 'config.startWithVideoMuted=true' : 'config.startWithVideoMuted=false',
    'interfaceConfig.MOBILE_APP_PROMO=false',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
  ].join('&')
  return `https://meet.jit.si/${encodeURIComponent(room)}#${params}`
}

export async function postPulse(userId: string, content: string, category = 'general', isAnonymous = true) {
  try {
    const text = content.trim()
    if (!text || text.length > 280) return { ok: false as const, error: '1–280 characters' }
    const { data, error } = await supabase.from('pulse_posts').insert({
      author_id: userId, content: text, category, is_anonymous: isAnonymous,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }).select('id, content, category, is_anonymous, likes, created_at').single()
    if (error) return { ok: false as const, error: error.message }
    try { await supabase.rpc('bump_rep', { p_user: userId, p_amount: 2 }) } catch { /* optional */ }
    return { ok: true as const, data, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Post failed' }
  }
}

export async function fetchPulseFeed() {
  try {
    const { data, error } = await supabase
      .from('pulse_posts')
      .select('id, content, category, is_anonymous, likes, created_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) return { ok: false as const, data: [], error: error.message }
    return { ok: true as const, data: data || [], error: null }
  } catch (e: any) {
    return { ok: false as const, data: [], error: e?.message || 'Load failed' }
  }
}
