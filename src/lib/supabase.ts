import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahtabgrlkyjjjqxvndlb.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_3YcwyaHxFjIcacIPNsxDWQ_IreLbFRE'

export const supabase = createClient(url, key)

const SUPER_ADMIN_EMAIL = 'affanahmed2302@gmail.com'

export function isSuperAdmin(email?: string | null) {
  return (email || '').toLowerCase().trim() === SUPER_ADMIN_EMAIL
}

export function displayName(p: any) {
  if (!p) return 'Student'
  return p.full_name || p.username || 'Student'
}

export function handleOf(p: any) {
  if (!p) return ''
  return p.username ? '@' + p.username : ''
}

export function yearToLabel(y?: number | string | null) {
  const n = Number(y)
  if (!n) return ''
  if (n === 1) return '1st year'
  if (n === 2) return '2nd year'
  if (n === 3) return '3rd year'
  if (n === 4) return '4th year'
  return String(y)
}

export function yearToNumber(y: unknown) {
  if (y === null || y === undefined || y === '') return null
  const n = Number(y)
  return Number.isFinite(n) ? n : null
}

export function rateLimit(key: string, ms = 2000) {
  if (typeof window === 'undefined') return true
  try {
    const k = 'rl-' + key
    const last = Number(sessionStorage.getItem(k) || 0)
    if (Date.now() - last < ms) return false
    sessionStorage.setItem(k, String(Date.now()))
    return true
  } catch { return true }
}

export function isRecentlyOnline(lastSeen?: string | null) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000
}

export async function touchPresence(userId: string) {
  try {
    await supabase.from('profiles').update({
      last_seen: new Date().toISOString(),
      is_online: true,
    }).eq('id', userId)
  } catch {}
}

export function isAllowedCollegeEmail(email: string) {
  const e = (email || '').toLowerCase()
  if (isSuperAdmin(e)) return true
  return e.includes('bms') && (e.endsWith('.ac.in') || e.endsWith('.edu') || e.endsWith('.in'))
}

export function jitsiRoom(kind: string, id: string) {
  const clean = (kind + '-' + id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 48)
  return 'hatch' + clean
}

export function jitsiEmbedUrl(room: string, audioOnly = false, display = 'Hatch') {
  const base = 'https://meet.jit.si/' + room
  const params = new URLSearchParams({
    'userInfo.displayName': display,
    configStartWithAudioMuted: 'false',
    configStartWithVideoMuted: audioOnly ? 'true' : 'false',
  })
  return base + '#' + params.toString()
}

export async function acceptTerms(userId: string) {
  try {
    const { error } = await supabase.from('profiles').update({
      terms_accepted: true,
      terms_accepted_at: new Date().toISOString(),
    }).eq('id', userId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function saveProfile(userId: string, fields: Record<string, unknown>) {
  try {
    const f = fields as any
    const payload: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
      college: f.college || 'BMS',
    }

    if (f.full_name !== undefined) {
      const name = String(f.full_name || '').trim()
      if (name.length < 2) return { ok: false as const, error: 'Display name required', data: null }
      const { data: taken } = await supabase.from('profiles').select('id').ilike('full_name', name).neq('id', userId).maybeSingle()
      if (taken) return { ok: false as const, error: 'Name already taken', data: null }
      payload.full_name = name
    }
    if (f.username !== undefined) {
      const uname = String(f.username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
      if (uname.length < 3) return { ok: false as const, error: 'Username min 3 chars', data: null }
      const { data: takenU } = await supabase.from('profiles').select('id').eq('username', uname).neq('id', userId).maybeSingle()
      if (takenU) return { ok: false as const, error: 'Username taken', data: null }
      payload.username = uname
    }
    if (f.bio !== undefined) payload.bio = f.bio
    if (f.department !== undefined) payload.department = f.department
    if (f.year !== undefined) payload.year = yearToNumber(f.year)
    if (f.phone !== undefined) payload.phone = f.phone
    if (f.github_handle !== undefined) payload.github_handle = f.github_handle
    if (f.leetcode_handle !== undefined) payload.leetcode_handle = f.leetcode_handle
    if (f.tech_stack !== undefined) payload.tech_stack = f.tech_stack
    if (f.skills !== undefined) payload.skills = f.skills
    if (f.avatar_url !== undefined) payload.avatar_url = f.avatar_url
    if (f.career_goal !== undefined) payload.career_goal = f.career_goal
    if (f.intent !== undefined) payload.intent = f.intent
    if (f.availability !== undefined) {
      const a = String(f.availability || '').trim()
      if (a && a.length <= 80) payload.availability = a
    }
    if (f.linkedin_url !== undefined) payload.linkedin_url = f.linkedin_url

    let { data, error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' }).select('*').single()

    if (error && (error.message.includes('schema cache') || error.message.includes('column') || error.message.includes('enum'))) {
      const core: Record<string, unknown> = {
        id: userId,
        updated_at: payload.updated_at,
        college: payload.college,
      }
      for (const k of ['full_name', 'username', 'bio', 'department', 'year', 'phone', 'github_handle', 'leetcode_handle', 'tech_stack', 'skills', 'avatar_url', 'career_goal', 'intent']) {
        if (payload[k] !== undefined) core[k] = payload[k]
      }
      const retry = await supabase.from('profiles').upsert(core, { onConflict: 'id' }).select('*').single()
      data = retry.data
      error = retry.error
      if (!error) return { ok: true as const, error: null, data, hint: 'Some optional fields skipped' }
    }

    if (error) return { ok: false as const, error: error.message, data: null }
    return { ok: true as const, error: null, data }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Save failed', data: null }
  }
}

export async function ensureProfile(userId: string, email?: string | null) {
  try {
    const { data } = await supabase.from('profiles').select('id, username, full_name').eq('id', userId).maybeSingle()
    if (!data) {
      await supabase.from('profiles').upsert({
        id: userId,
        email: email || null,
        college: 'BMS',
        role: 'student',
        skills: [],
        connection_count: 0,
        terms_accepted: false,
      }, { onConflict: 'id' })
    }
  } catch {}
}
