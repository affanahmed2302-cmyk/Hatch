import { createClient } from '@supabase/supabase-js'
import { isAllowedStudentEmail, collegePodFromEmail, extractDomain } from './college'

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
  if (SUPER_ADMINS.includes(e)) return { ok: true }
  const res = isAllowedStudentEmail(e)
  if (!res.ok) return { ok: false, error: res.error }
  return { ok: true }
}

export { collegePodFromEmail, extractDomain, isAllowedStudentEmail }

export async function touchPresence(userId: string) {
  try {
    await supabase.from('profiles').update({
      last_seen: new Date().toISOString(),
      is_online: true,
    }).eq('id', userId)
  } catch { /* optional */ }
}

export function isRecentlyOnline(lastSeen?: string | null) {
  if (!lastSeen) return false
  return Date.now() - new Date(lastSeen).getTime() < 3 * 60 * 1000
}

const _rl: Record<string, number> = {}
export function rateLimit(key: string, ms = 2000): boolean {
  const now = Date.now()
  if (_rl[key] && now - _rl[key] < ms) return false
  _rl[key] = now
  return true
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
    const f = fields as any
    const payload: Record<string, unknown> = {
      id: userId,
      updated_at: new Date().toISOString(),
      college: f.college || 'BMS',
    }
    if (f.college_pod !== undefined) payload.college_pod = f.college_pod
    if (f.college_domain !== undefined) payload.college_domain = f.college_domain
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
    if (f.availability !== undefined) payload.availability = f.availability
    if (f.gender !== undefined) payload.gender = f.gender
    if (f.github_url !== undefined) payload.github_url = f.github_url
    if (f.linkedin_url !== undefined) payload.linkedin_url = f.linkedin_url
    if (f.branch !== undefined) payload.branch = f.branch
    const { data, error } = await supabase.from('profiles').upsert(payload).select('*').single()
    if (error) return { ok: false as const, error: error.message, data: null }
    return { ok: true as const, error: null, data }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Save failed', data: null }
  }
}

export function jitsiMeetUrl(room: string, displayName: string) {
  const params = [
    'config.prejoinPageEnabled=false',
    'interfaceConfig.SHOW_JITSI_WATERMARK=false',
    `userInfo.displayName=${encodeURIComponent(displayName)}`,
  ].join('&')
  return `https://meet.jit.si/${encodeURIComponent(room)}#${params}`
}

export async function postPulse(userId: string, content: string, category = 'general', isAnonymous = true) {
  try {
    const text = content.trim()
    if (!text || text.length > 280) return { ok: false as const, error: '1-280 characters' }
    const { data, error } = await supabase.from('pulse_posts').insert({
      author_id: userId, content: text, category, is_anonymous: isAnonymous,
      expires_at: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }).select('id, author_id, content, category, is_anonymous, likes, created_at').single()
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
      .select('id, author_id, content, category, is_anonymous, likes, created_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(40)
    if (error) return { ok: false as const, data: [], error: error.message }
    return { ok: true as const, data: data || [], error: null }
  } catch (e: any) {
    return { ok: false as const, data: [], error: e?.message || 'Load failed' }
  }
}

export async function deletePulse(postId: string, userId: string) {
  try {
    const { error } = await supabase
      .from('pulse_posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', userId)
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Delete failed' }
  }
}
