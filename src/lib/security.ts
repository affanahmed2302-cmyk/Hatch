import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ahtabgrlkyjjjqxvndlb.supabase.co'
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_3YcwyaHxFjIcacIPNsxDWQ_IreLbFRE'

/** Server-only admin client — requires SUPABASE_SERVICE_ROLE_KEY on Vercel */
export function supabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return null
  return createClient(URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Validate Authorization: Bearer <access_token> and return user */
export async function requireUser(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return { user: null, error: 'Missing auth token' as const }

  const sb = createClient(URL, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await sb.auth.getUser(token)
  if (error || !data.user) return { user: null, error: 'Invalid session' as const }
  return { user: data.user, error: null }
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
  }
}
