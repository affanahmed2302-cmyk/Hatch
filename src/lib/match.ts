import { supabase } from './supabase'
import { getBlockedIds } from './safety'
import { partitionConnections } from './connections'

export type MatchCandidate = {
  id: string
  full_name?: string | null
  username?: string | null
  bio?: string | null
  department?: string | null
  year?: number | null
  avatar_url?: string | null
  skills?: string[]
  intent?: string | null
  career_goal?: string | null
  score: number
  reasons: string[]
}

function normSkill(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9+#.]/g, '')
}

function skillSet(skills: unknown): Set<string> {
  const arr = Array.isArray(skills)
    ? skills
    : typeof skills === 'string'
      ? skills.split(/[,;|]/)
      : []
  return new Set(arr.map((s) => normSkill(String(s))).filter((s) => s.length >= 2))
}

export function scoreMatch(
  me: { skills?: unknown; intent?: string | null; career_goal?: string | null; department?: string | null; year?: number | null },
  peer: { skills?: unknown; intent?: string | null; career_goal?: string | null; department?: string | null; year?: number | null }
): { score: number; reasons: string[] } {
  const mine = skillSet(me.skills)
  const theirs = skillSet(peer.skills)
  const reasons: string[] = []

  let shared = 0
  let complementary = 0
  for (const s of theirs) {
    if (mine.has(s)) shared++
    else complementary++
  }
  for (const s of mine) {
    if (!theirs.has(s)) complementary += 0.35
  }

  const sharedRatio = mine.size + theirs.size === 0 ? 0 : shared / Math.max(1, Math.min(mine.size, theirs.size) || 1)
  const compRatio = Math.min(1, complementary / Math.max(3, theirs.size || 1))

  const intentTokens = (t?: string | null) =>
    new Set(
      String(t || '')
        .toLowerCase()
        .split(/[\s,/|]+/)
        .filter((w) => w.length > 2)
    )
  const myGoals = new Set([...intentTokens(me.intent), ...intentTokens(me.career_goal)])
  const peerGoals = new Set([...intentTokens(peer.intent), ...intentTokens(peer.career_goal)])
  let goalHits = 0
  for (const g of peerGoals) if (myGoals.has(g)) goalHits++
  const goalScore = Math.min(1, goalHits / 2)

  let campus = 0
  if (me.department && peer.department && me.department === peer.department) {
    campus += 0.6
    reasons.push(`Same department (${me.department})`)
  }
  if (me.year != null && peer.year != null && me.year === peer.year) {
    campus += 0.4
    reasons.push('Same year')
  }

  if (shared > 0) {
    const sample = [...theirs].filter((s) => mine.has(s)).slice(0, 3)
    reasons.push(`Shared skills: ${sample.join(', ')}`)
  }
  if (complementary >= 1 && theirs.size) {
    const extra = [...theirs].filter((s) => !mine.has(s)).slice(0, 3)
    if (extra.length) reasons.push(`They bring: ${extra.join(', ')}`)
  }
  if (goalHits > 0) reasons.push('Similar goals or intent')

  const score =
    0.35 * compRatio + 0.25 * Math.min(1, sharedRatio) + 0.25 * goalScore + 0.15 * Math.min(1, campus)
  const floor = mine.size === 0 && theirs.size === 0 ? 0.08 : 0
  return { score: Math.min(1, score + floor), reasons: reasons.slice(0, 4) }
}

export async function fetchSkillMatches(myId: string, limit = 24): Promise<MatchCandidate[]> {
  const blocked = await getBlockedIds(myId)
  const { accepted, pendingOut, pendingIn } = await partitionConnections(myId)
  const skip = new Set<string>([myId, ...blocked, ...accepted, ...pendingOut, ...pendingIn])

  const { data: me } = await supabase
    .from('profiles')
    .select('id, skills, intent, career_goal, department, year')
    .eq('id', myId)
    .maybeSingle()

  const { data: rows } = await supabase
    .from('profiles')
    .select('id, full_name, username, bio, department, year, avatar_url, skills, intent, career_goal')
    .neq('id', myId)
    .limit(120)

  const scored: MatchCandidate[] = []
  for (const p of rows || []) {
    if (skip.has(p.id)) continue
    if (!p.full_name && !p.username) continue
    const { score, reasons } = scoreMatch(me || {}, p)
    scored.push({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio,
      department: p.department,
      year: p.year,
      avatar_url: p.avatar_url,
      skills: Array.isArray(p.skills) ? p.skills : [],
      intent: p.intent,
      career_goal: p.career_goal,
      score,
      reasons: reasons.length ? reasons : ['Campus student to discover'],
    })
  }

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit)
}
