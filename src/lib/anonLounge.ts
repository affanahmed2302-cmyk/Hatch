import { supabase } from './supabase'

/** Lightweight client-side filter — blocks obvious vulgar / harassment terms */
const BLOCKED = [
  'fuck', 'fck', 'f*ck', 'shit', 'bitch', 'asshole', 'bastard', 'dick', 'pussy',
  'slut', 'whore', 'cunt', 'nigger', 'nigga', 'retard', 'rape', 'kill yourself',
  'kys', 'sex chat', 'nude', 'nudes', 'porn', 'horny', 'boobs', 'tits',
  'mc ', ' bc ', 'bhenchod', 'madarchod', 'chutiya', 'chutia', 'gandu', 'randi',
  'harami', 'suar', 'lavde', 'laude',
]

export function checkAnonMessage(text: string): { ok: boolean; error?: string } {
  const t = text.trim()
  if (!t) return { ok: false, error: 'Write something' }
  if (t.length > 500) return { ok: false, error: 'Max 500 characters' }
  const lower = ` ${t.toLowerCase()} `
  for (const w of BLOCKED) {
    if (lower.includes(w.toLowerCase())) {
      return { ok: false, error: 'Message blocked — no vulgar or abusive language in Anonymous Lounge' }
    }
  }
  // No @handles / phone numbers that could dox
  if (/@\w{3,}/.test(t) && !t.includes('@campus')) {
    return { ok: false, error: 'Don’t share social handles here — stay anonymous' }
  }
  if (/(\+?\d[\d\s\-]{8,}\d)/.test(t)) {
    return { ok: false, error: 'Don’t share phone numbers in Anonymous Lounge' }
  }
  return { ok: true }
}

export async function isAnonBanned(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('anon_lounge_bans').select('user_id').eq('user_id', userId).maybeSingle()
    if (data) return true
    const { data: p } = await supabase.from('profiles').select('app_banned').eq('id', userId).maybeSingle()
    return !!p?.app_banned
  } catch {
    return false
  }
}

export async function isAppBanned(userId: string): Promise<boolean> {
  try {
    const { data } = await supabase.from('profiles').select('app_banned').eq('id', userId).maybeSingle()
    return !!data?.app_banned
  } catch {
    return false
  }
}

export async function banFromAnon(userId: string, byId: string, reason: string) {
  const { error } = await supabase.from('anon_lounge_bans').upsert({
    user_id: userId,
    banned_by: byId,
    reason: reason || 'Policy violation',
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const }
}

export async function banFromApp(userId: string) {
  const { error } = await supabase.from('profiles').update({ app_banned: true }).eq('id', userId)
  if (error) return { ok: false as const, error: error.message }
  // Also anon ban
  await supabase.from('anon_lounge_bans').upsert({ user_id: userId, reason: 'App ban' })
  return { ok: true as const }
}

export async function saveAnonConsent(userId: string) {
  try {
    await supabase.from('profiles').update({ anon_consent_at: new Date().toISOString() }).eq('id', userId)
  } catch { /* optional column */ }
  try {
    localStorage.setItem('hatch_anon_consent_v1', '1')
  } catch { /* */ }
}

export function hasLocalAnonConsent(): boolean {
  try {
    return localStorage.getItem('hatch_anon_consent_v1') === '1'
  } catch {
    return false
  }
}

/** Stable fake label so threads feel continuous without revealing identity */
export function anonLabel(senderId: string): string {
  let h = 0
  for (let i = 0; i < senderId.length; i++) h = (h * 31 + senderId.charCodeAt(i)) >>> 0
  const n = (h % 9000) + 1000
  return `Anon #${n}`
}

export const ANON_CONSENT_POINTS = [
  'Your real name, photo, and profile stay hidden in Anonymous Lounge.',
  'This space is for honest questions, stress, studies, mental health, and campus life — without fear of judgment.',
  'Be respectful. No harsh language, no bullying, no targeting anyone by name.',
  'No vulgar, sexual, or abusive content. Violations = permanent removal from Anonymous Lounge.',
  'Serious abuse can get you removed from Hatch entirely by the admin.',
  'Do not share phone numbers, social IDs, or try to uncover others’ identities.',
  'If you are in crisis, also reach real help (e.g. local helplines) — this is peer support, not a therapist.',
]
