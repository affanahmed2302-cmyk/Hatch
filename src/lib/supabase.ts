import { createClient } from '@supabase/supabase-js'
import { isAllowedStudentEmail, collegePodFromEmail, extractDomain } from './college'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahtabgrlkyjjqxvndlb.supabase.co'
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(url, key)

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

const _rl: Record<string, { t: number; c: number }> = {}
export function rateLimit(key: string, a = 2000, b?: number): boolean {
  const now = Date.now()
  if (typeof b === 'number') {
    const max = a
    const windowMs = b
    const slot = _rl[key]
    if (!slot || now - slot.t >= windowMs) {
      _rl[key] = { t: now, c: 1 }
      return true
    }
    if (slot.c >= max) return false
    slot.c += 1
    return true
  }
  const last = _rl[key]?.t || 0
  if (now - last < a) return false
  _rl[key] = { t: now, c: 1 }
  return true
}

export function displayName(p: any): string {
  if (!p) return 'Student'
  return (p.full_name || p.username || p.email?.split('@')[0] || 'Student').trim()
}

export function yearToLabel(y?: number | string | null) {
  if (y == null || y === '') return ''
  const n = typeof y === 'number' ? y : parseInt(String(y), 10)
  if (Number.isNaN(n)) return String(y)
  const map: Record<number, string> = { 1: '1st year', 2: '2nd year', 3: '3rd year', 4: '4th year' }
  return map[n] || String(y)
}

function yearToNumber(y: unknown) {
  if (typeof y === 'number') return y
  const s = String(y || '')
  const m = s.match(/(\d)/)
  return m ? parseInt(m[1], 10) : null
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
    if (f.leetcode_url !== undefined) payload.leetcode_url = f.leetcode_url
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

export async function ensureProfile(userId: string, email?: string | null) {
  try {
    const { data } = await supabase.from('profiles').select('id, full_name, username').eq('id', userId).maybeSingle()
    if (!data) {
      const pod = email ? collegePodFromEmail(email) : 'bmsce'
      const domain = email ? extractDomain(email) : null
      const local = email ? email.split('@')[0].replace(/[._0-9]/g, ' ').trim() : ''
      const guessName = local ? local.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ').slice(0, 40) : null
      await supabase.from('profiles').upsert({
        id: userId,
        email: email || null,
        full_name: guessName || null,
        college: pod.toUpperCase(),
        college_pod: pod,
        college_domain: domain,
        role: 'student',
        skills: [],
        connection_count: 0,
        terms_accepted: false,
        rep_score: 0,
      }, { onConflict: 'id' })
    }
  } catch { /* */ }
}

export async function jitsiRoom(_kind: string, id: string) {
  return 'hatch-' + id.slice(0, 24)
}

export function jitsiEmbedUrl(room: string) {
  return 'https://meet.jit.si/' + room
}
