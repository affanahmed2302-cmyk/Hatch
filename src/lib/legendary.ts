import { supabase } from './supabase'

/** 12:00 AM – 3:00 AM local device time */
export function isMidnightBlackout(now = new Date()): boolean {
  const h = now.getHours()
  return h >= 0 && h < 3
}

export function blackoutCountdown(now = new Date()): string {
  if (isMidnightBlackout(now)) {
    const end = new Date(now)
    end.setHours(3, 0, 0, 0)
    const ms = end.getTime() - now.getTime()
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    return `${h}h ${m}m left · closes 3 AM`
  }
  const next = new Date(now)
  if (now.getHours() >= 3) next.setDate(next.getDate() + 1)
  next.setHours(0, 0, 0, 0)
  const ms = next.getTime() - now.getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `Opens in ${h}h ${m}m · 12 AM–3 AM`
}

export function tonightKey(now = new Date()): string {
  const d = new Date(now)
  return d.toLocaleDateString('en-CA')
}

export function genderLabel(g?: string | null) {
  if (!g) return 'Someone'
  const s = g.toLowerCase()
  if (s.includes('woman') || s === 'f' || s === 'female') return 'A woman'
  if (s.includes('man') && !s.includes('woman')) return 'A man'
  if (s.includes('non')) return 'Someone'
  return 'Someone'
}

export function genderEmoji(g?: string | null) {
  if (!g) return '💜'
  const s = g.toLowerCase()
  if (s.includes('woman') || s === 'f' || s === 'female') return '👩'
  if (s.includes('man') && !s.includes('woman')) return '👨'
  return '💜'
}

export async function postMidnightDrop(
  userId: string,
  body: string,
  kind: 'confession' | 'project' | 'pulse' = 'confession'
) {
  if (!isMidnightBlackout()) {
    return { ok: false as const, error: 'Only live 12:00 AM – 3:00 AM' }
  }
  const t = body.trim().slice(0, 280)
  if (t.length < 3) return { ok: false as const, error: 'Too short' }
  try {
    const { error } = await supabase.from('midnight_drops').insert({
      user_id: userId,
      body: t,
      kind,
      drop_night: tonightKey(),
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function fetchMidnightDrops() {
  try {
    const { data } = await supabase
      .from('midnight_drops')
      .select('id, body, kind, created_at')
      .eq('drop_night', tonightKey())
      .order('created_at', { ascending: false })
      .limit(50)
    return data || []
  } catch {
    return []
  }
}

/** Directed secret confession — target never sees your name until mutual reveal */
export async function sendSecretConfession(fromId: string, toId: string, body: string) {
  if (!isMidnightBlackout()) {
    return { ok: false as const, error: 'Secret confessions only 12 AM – 3 AM' }
  }
  if (fromId === toId) return { ok: false as const, error: 'Cannot confess to yourself' }
  const t = body.trim().slice(0, 400)
  if (t.length < 5) return { ok: false as const, error: 'Write a bit more' }
  try {
    let fromGender: string | null = null
    const { data: sp } = await supabase.from('sparks_profiles').select('gender').eq('user_id', fromId).maybeSingle()
    if (sp?.gender) fromGender = sp.gender
    else {
      const { data: pr } = await supabase.from('profiles').select('gender').eq('id', fromId).maybeSingle()
      fromGender = pr?.gender || null
    }

    const { error } = await supabase.from('secret_confessions').insert({
      from_id: fromId,
      to_id: toId,
      body: t,
      night_key: tonightKey(),
      status: 'pending',
      from_gender: fromGender,
    })
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed' }
  }
}

export async function myIncomingSecrets(userId: string) {
  try {
    const { data } = await supabase
      .from('secret_confessions')
      .select('id, body, status, from_revealed, to_interested, to_revealed, created_at, from_id, from_gender')
      .eq('to_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)
    return data || []
  } catch {
    return []
  }
}

export async function myOutgoingSecrets(userId: string) {
  try {
    const { data } = await supabase
      .from('secret_confessions')
      .select('id, body, status, from_revealed, to_interested, to_revealed, created_at, to_id, from_gender')
      .eq('from_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)
    return data || []
  } catch {
    return []
  }
}

export async function markSecretInterested(confessionId: string, userId: string) {
  const { error } = await supabase
    .from('secret_confessions')
    .update({ to_interested: true, status: 'interested' })
    .eq('id', confessionId)
    .eq('to_id', userId)
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, error: null }
}

export async function offerReveal(confessionId: string, userId: string) {
  const { data: row } = await supabase
    .from('secret_confessions')
    .select('*')
    .eq('id', confessionId)
    .maybeSingle()
  if (!row) return { ok: false as const, error: 'Not found', mutual: false }

  const patch: Record<string, unknown> = {}
  if (row.from_id === userId) patch.from_revealed = true
  else if (row.to_id === userId) patch.to_revealed = true
  else return { ok: false as const, error: 'Not yours', mutual: false }

  const fromR = row.from_id === userId ? true : row.from_revealed
  const toR = row.to_id === userId ? true : row.to_revealed
  if (fromR && toR) patch.status = 'mutual'

  const { error } = await supabase.from('secret_confessions').update(patch).eq('id', confessionId)
  if (error) return { ok: false as const, error: error.message, mutual: false }
  return { ok: true as const, error: null, mutual: !!(fromR && toR) }
}

export async function resolveConfessionPeer(confession: any, myId: string) {
  if (!confession.from_revealed || !confession.to_revealed) return null
  const peerId = confession.from_id === myId ? confession.to_id : confession.from_id
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, username, avatar_url, department, gender')
    .eq('id', peerId)
    .maybeSingle()
  return data
}

export const RADAR_INTENTS = [
  { id: 'code', label: 'Late-night code' },
  { id: 'coffee', label: 'Coffee / chai' },
  { id: 'study', label: 'Study buddy' },
  { id: 'walk', label: 'Campus walk' },
  { id: 'hack', label: 'Hack pair' },
  { id: 'food', label: 'Food run' },
] as const

export async function setRadarIntent(
  userId: string,
  intent: string,
  zone = 'campus',
  coords?: { lat: number; lng: number } | null
) {
  try {
    const expires = new Date(Date.now() + 45 * 60 * 1000).toISOString()
    const { error } = await supabase.from('radar_intents').upsert(
      {
        user_id: userId,
        intent,
        zone,
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        expires_at: expires,
      },
      { onConflict: 'user_id' }
    )
    if (error) return { ok: false as const, error: error.message }
    return { ok: true as const, error: null }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Radar failed' }
  }
}

function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toR = (d: number) => (d * Math.PI) / 180
  const dLat = toR(b.lat - a.lat)
  const dLng = toR(b.lng - a.lng)
  const lat1 = toR(a.lat)
  const lat2 = toR(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export async function fetchRadarPeers(myId: string, myCoords?: { lat: number; lng: number } | null) {
  try {
    const { data } = await supabase
      .from('radar_intents')
      .select('user_id, intent, zone, lat, lng, expires_at')
      .neq('user_id', myId)
      .gt('expires_at', new Date().toISOString())
      .limit(40)
    if (!data?.length) return []
    const ids = data.map((d) => d.user_id)
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, skills')
      .in('id', ids)
    const map = Object.fromEntries((profs || []).map((p: any) => [p.id, p]))
    return data
      .map((d) => {
        let distM: number | null = null
        if (myCoords && d.lat != null && d.lng != null) {
          distM = Math.round(haversineM(myCoords, { lat: d.lat, lng: d.lng }))
        }
        return { ...d, profile: map[d.user_id], distM }
      })
      .filter((d) => d.profile)
      .sort((a, b) => {
        if (a.distM != null && b.distM != null) return a.distM - b.distM
        if (a.distM != null) return -1
        if (b.distM != null) return 1
        return 0
      })
  } catch {
    return []
  }
}

export async function requestBurner(fromId: string, toId: string) {
  try {
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('burner_handshakes')
      .insert({ a_id: fromId, b_id: toId, status: 'pending', expires_at: expires })
      .select('id')
      .single()
    if (error) return { ok: false as const, error: error.message, id: null }
    return { ok: true as const, error: null, id: data.id as string }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed', id: null }
  }
}

export async function acceptBurner(handshakeId: string, userId: string) {
  try {
    const { data, error } = await supabase
      .from('burner_handshakes')
      .update({ status: 'active' })
      .eq('id', handshakeId)
      .eq('b_id', userId)
      .gt('expires_at', new Date().toISOString())
      .select('a_id, b_id')
      .maybeSingle()
    if (error) return { ok: false as const, error: error.message, peer: null }
    if (!data) return { ok: false as const, error: 'Expired or not found', peer: null }
    const peer = data.a_id === userId ? data.b_id : data.a_id
    return { ok: true as const, error: null, peer }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Failed', peer: null }
  }
}

export async function myBurners(userId: string) {
  try {
    const { data } = await supabase
      .from('burner_handshakes')
      .select('id, a_id, b_id, status, expires_at')
      .or(`a_id.eq.${userId},b_id.eq.${userId}`)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(20)
    return data || []
  } catch {
    return []
  }
}

function skillTokens(p: any): Set<string> {
  const raw = [p.skills, p.bio, p.department, p.github_url].filter(Boolean).join(' ').toLowerCase()
  return new Set(raw.split(/[^a-z0-9+#.]/i).filter((t) => t.length > 1))
}

function jaccard(a: Set<string>, b: Set<string>) {
  if (!a.size || !b.size) return 0
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / (a.size + b.size - inter)
}

export async function negotiateGhostSquad(forUserId: string) {
  try {
    const { data: me } = await supabase
      .from('profiles')
      .select('id, skills, bio, department, github_url, year')
      .eq('id', forUserId)
      .maybeSingle()
    if (!me) return { ok: false as const, error: 'No profile', squad: null }

    const { data: pool } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, skills, bio, department, github_url, year, rep_score')
      .neq('id', forUserId)
      .limit(120)

    const myTok = skillTokens(me)
    const scored = (pool || [])
      .map((p) => {
        const tok = skillTokens(p)
        let score = Math.round(jaccard(myTok, tok) * 100)
        if (p.department && me.department && p.department !== me.department) score += 8
        if (p.github_url) score += 5
        if ((p.rep_score || 0) > 10) score += 3
        return { profile: p, score }
      })
      .filter((x) => x.score > 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    if (!scored.length) return { ok: true as const, error: null, squad: null }

    const member_ids = scored.map((s) => s.profile.id)
    const reason = scored
      .map((s) => `${s.profile.username || s.profile.full_name}: ${s.score}% fit`)
      .join(' · ')
    const avg = Math.round(scored.reduce((a, s) => a + s.score, 0) / scored.length)

    await supabase.from('ghost_squads').insert({
      for_user: forUserId,
      member_ids,
      reason,
      score: avg,
      status: 'suggested',
    })

    return {
      ok: true as const,
      error: null,
      squad: { members: scored.map((s) => s.profile), reason, score: avg },
    }
  } catch (e: any) {
    return { ok: false as const, error: e?.message || 'Ghost failed', squad: null }
  }
}

export async function latestGhostSquad(userId: string) {
  try {
    const { data } = await supabase
      .from('ghost_squads')
      .select('*')
      .eq('for_user', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data?.member_ids?.length) return null
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url, department, skills')
      .in('id', data.member_ids)
    return { ...data, members: profs || [] }
  } catch {
    return null
  }
}
