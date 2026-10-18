/**
 * Career rank — deterministic “AI look” at profile links + activity.
 * No external API keys required (works offline from stored profile fields).
 *
 * Points (max profile part ~100):
 *  GitHub link/handle     +25
 *  LinkedIn URL           +20
 *  LeetCode handle/URL    +25
 *  Phone (optional)       +10
 *  Skills (up to 5)       +3 each (max 15)
 *  Solid bio (≥20 chars)+10
 *  Avatar                 +5
 * Plus existing rep_score from campus activity.
 */

export type RankableProfile = {
  github_url?: string | null
  github_handle?: string | null
  linkedin_url?: string | null
  leetcode_url?: string | null
  leetcode_handle?: string | null
  phone?: string | null
  skills?: string[] | string | null
  bio?: string | null
  avatar_url?: string | null
  rep_score?: number | null
}

function hasText(v?: string | null) {
  return !!(v && String(v).trim().length > 0)
}

function normalizeGithub(urlOrHandle?: string | null): string | null {
  if (!hasText(urlOrHandle)) return null
  const s = String(urlOrHandle).trim()
  const m = s.match(/github\.com\/([A-Za-z0-9-]+)/i)
  if (m) return m[1]
  if (/^[A-Za-z0-9-]+$/.test(s)) return s
  return s
}

function normalizeLeetcode(urlOrHandle?: string | null): string | null {
  if (!hasText(urlOrHandle)) return null
  const s = String(urlOrHandle).trim()
  const m = s.match(/leetcode\.com\/(u\/)?([A-Za-z0-9_-]+)/i)
  if (m) return m[2]
  if (/^[A-Za-z0-9_-]+$/.test(s)) return s
  return s
}

export function skillList(skills?: string[] | string | null): string[] {
  if (!skills) return []
  if (Array.isArray(skills)) return skills.map((s) => String(s).trim()).filter(Boolean)
  return String(skills)
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** Profile completeness / career signals only (0–100-ish) */
export function computeCareerScore(p: RankableProfile): number {
  let score = 0
  if (hasText(p.github_url) || hasText(p.github_handle)) score += 25
  if (hasText(p.linkedin_url)) score += 20
  if (hasText(p.leetcode_url) || hasText(p.leetcode_handle)) score += 25
  if (hasText(p.phone) && String(p.phone).replace(/\D/g, '').length >= 10) score += 10
  const skills = skillList(p.skills)
  score += Math.min(15, skills.length * 3)
  if (hasText(p.bio) && String(p.bio).trim().length >= 20) score += 10
  if (hasText(p.avatar_url)) score += 5
  return score
}

/** Final leaderboard rank points */
export function computeLeaderScore(p: RankableProfile): number {
  const activity = Number(p.rep_score) || 0
  return activity + computeCareerScore(p)
}

export function rankBreakdown(p: RankableProfile): { label: string; pts: number }[] {
  const rows: { label: string; pts: number }[] = []
  if (hasText(p.github_url) || hasText(p.github_handle)) rows.push({ label: 'GitHub', pts: 25 })
  if (hasText(p.linkedin_url)) rows.push({ label: 'LinkedIn', pts: 20 })
  if (hasText(p.leetcode_url) || hasText(p.leetcode_handle)) rows.push({ label: 'LeetCode', pts: 25 })
  if (hasText(p.phone) && String(p.phone).replace(/\D/g, '').length >= 10) rows.push({ label: 'Phone', pts: 10 })
  const n = Math.min(5, skillList(p.skills).length)
  if (n) rows.push({ label: `Skills ×${n}`, pts: n * 3 })
  if (hasText(p.bio) && String(p.bio).trim().length >= 20) rows.push({ label: 'Bio', pts: 10 })
  if (hasText(p.avatar_url)) rows.push({ label: 'Photo', pts: 5 })
  const rep = Number(p.rep_score) || 0
  if (rep) rows.push({ label: 'Campus activity', pts: rep })
  return rows
}

export function githubHref(p: RankableProfile): string | null {
  if (hasText(p.github_url) && String(p.github_url).includes('http')) return String(p.github_url).trim()
  const h = normalizeGithub(p.github_handle || p.github_url)
  return h ? `https://github.com/${h}` : null
}

export function leetcodeHref(p: RankableProfile): string | null {
  if (hasText(p.leetcode_url) && String(p.leetcode_url).includes('http')) return String(p.leetcode_url).trim()
  const h = normalizeLeetcode(p.leetcode_handle || p.leetcode_url)
  return h ? `https://leetcode.com/${h}` : null
}

export function linkedinHref(p: RankableProfile): string | null {
  if (!hasText(p.linkedin_url)) return null
  const s = String(p.linkedin_url).trim()
  if (s.startsWith('http')) return s
  return `https://linkedin.com/in/${s.replace(/^\//, '')}`
}
