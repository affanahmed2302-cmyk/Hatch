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

export function suggestUsername(fullName: string, seed?: string) {
  const base = (fullName || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user'
  const suffix = (seed || Math.random().toString(36).slice(2, 6)).slice(0, 4)
  return `${base}${suffix}`
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
  if (n === 1) return '1st Year'
  if (n === 2) return '2nd Year'
  if (n === 3) return '3rd Year'
  if (n === 4) return '4th Year'
  return String(y)
}

export async function saveProfile(userId: string, fields: Record<string, unknown>) {
  const { college_id: _drop, year, full_name, username, ...rest } = fields as any
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
    if (uname.length >= 3) {
      const { data: takenU } = await supabase.from('profiles').select('id').eq('username', uname).neq('id', userId).maybeSingle()
      if (takenU) return { ok: false as const, error: 'Username taken', data: null }
      payload.username = uname
    }
  }
  if (!payload.college) payload.college = 'BMS'
  const { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single()
  if (error) return { ok: false as const, error: `${error.code || 'ERR'}: ${error.message}`, data: null }
  return { ok: true as const, error: null, data }
}

export async function ensureUsername(userId: string, fullName?: string | null) {
  const { data } = await supabase.from('profiles').select('username, full_name').eq('id', userId).maybeSingle()
  if (data?.username) return data.username
  let attempt = 0
  while (attempt < 8) {
    const uname = suggestUsername(fullName || data?.full_name || 'bms', userId.slice(0, 4) + attempt)
    const { data: taken } = await supabase.from('profiles').select('id').eq('username', uname).maybeSingle()
    if (!taken) {
      await supabase.from('profiles').update({ username: uname, updated_at: new Date().toISOString() }).eq('id', userId)
      return uname
    }
    attempt++
  }
  return null
}

export async function ensureProfile(userId: string, email?: string | null) {
  const { data } = await supabase.from('profiles').select('id, username, full_name').eq('id', userId).maybeSingle()
  if (!data) {
    await supabase.from('profiles').upsert({
      id: userId, email: email || null, college: 'BMS', role: 'student',
      skills: [], connection_count: 0, terms_accepted: false,
    }, { onConflict: 'id' })
  }
  await ensureUsername(userId, data?.full_name)
}

export async function needsTermsAcceptance(userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('terms_accepted').eq('id', userId).maybeSingle()
  return !data?.terms_accepted
}

export async function acceptTerms(userId: string) {
  const { error } = await supabase.from('profiles').update({
    terms_accepted: true, terms_accepted_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export function jitsiRoom(kind: 'dm' | 'team', id: string) {
  const clean = id.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 24)
  return `mesh${kind}${clean}`
}

export function jitsiEmbedUrl(room: string, audioOnly = false, displayName = 'Mesh') {
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

export const CHAT_WALLPAPERS = [
  { id: 'default', name: 'Default', bg: '#0a0a0b' },
  { id: 'night', name: 'Night', bg: 'linear-gradient(180deg,#0f0c29,#302b63,#24243e)' },
  { id: 'campus', name: 'Campus', bg: 'linear-gradient(160deg,#1a120b,#2d1f12,#0a0a0b)' },
  { id: 'mint', name: 'Mint', bg: 'linear-gradient(180deg,#0a1f1a,#0a0a0b)' },
  { id: 'rose', name: 'Rose', bg: 'linear-gradient(180deg,#1f0a12,#0a0a0b)' },
  { id: 'gold', name: 'Gold', bg: 'linear-gradient(180deg,#1a1508,#0a0a0b)' },
]

export function getWallpaper(id: string) {
  return CHAT_WALLPAPERS.find(w => w.id === id) || CHAT_WALLPAPERS[0]
}
