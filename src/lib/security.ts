import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** Server-only admin client — requires SUPABASE_SERVICE_ROLE_KEY on Vercel */
export function supabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key || !URL) return null
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Validate Authorization: Bearer <access_token> and return user */
export async function requireUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return { user: null, error: 'Missing auth token' as const }
  if (!URL || !ANON) return { user: null, error: 'Server misconfigured' as const }

  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return { user: null, error: 'Invalid session' as const }
  return { user: data.user, error: null }
}

const SUPER_ADMINS = (process.env.HATCH_SUPER_ADMINS || 'affanahmed2302@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

export function isServerSuperAdmin(email?: string | null) {
  if (!email) return false
  return SUPER_ADMINS.includes(email.toLowerCase())
}

/** Require authenticated user AND super-admin email */
export async function requireAdmin(req: NextRequest) {
  const { user, error } = await requireUser(req)
  if (!user) return { user: null, error: error || 'Unauthorized' as const }
  if (!isServerSuperAdmin(user.email)) return { user: null, error: 'Forbidden' as const }
  return { user, error: null }
}

const hits = new Map<string, { n: number; t: number }>()

/** Simple in-memory rate limit (per serverless instance) */
export function apiRateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const row = hits.get(key)
  if (!row || now - row.t > windowMs) {
    hits.set(key, { n: 1, t: now })
    return true
  }
  if (row.n >= max) return false
  row.n += 1
  return true
}

export function securityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
    'X-XSS-Protection': '1; mode=block',
    'Cache-Control': 'no-store',
  }
}

/** Fail closed if critical env missing (API routes) */
export function assertEnv(keys: string[]): string | null {
  for (const k of keys) {
    if (!process.env[k]) return `Missing env: ${k}`
  }
  return null
}
