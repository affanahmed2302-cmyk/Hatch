import { supabase, isAllowedCollegeEmail, isSuperAdmin, ensureProfile } from './supabase'
import { collegePodFromEmail, extractDomain } from './college'

/** Start Google OAuth — enable Google provider in Supabase Auth settings */
export async function signInWithGoogle(redirectPath = '/auth/callback') {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}${redirectPath}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, url: data.url, error: null }
}

/** After OAuth: enforce college email (super-admin Gmail allowed) */
export async function finalizeOAuthSession(): Promise<{
  ok: boolean
  error?: string
  next?: string
}> {
  try {
    const href = typeof window !== 'undefined' ? window.location.href : ''
    if (href.includes('code=')) {
      await supabase.auth.exchangeCodeForSession(href)
    }
  } catch {
    /* session may already exist */
  }

  const { data: { session } } = await supabase.auth.getSession()
  const user = session?.user
  if (!user?.email) {
    return { ok: false, error: 'Google sign-in failed — try again' }
  }

  const email = user.email.toLowerCase()
  const allowed = isAllowedCollegeEmail(email)
  if (!allowed.ok && !isSuperAdmin(email)) {
    await supabase.auth.signOut()
    return {
      ok: false,
      error:
        'Use a college Google account (.ac.in / .edu). Personal Gmail is only allowed for the founder admin.',
    }
  }

  await ensureProfile(user.id, email)
  const pod = collegePodFromEmail(email)
  const domain = extractDomain(email)
  try {
    await supabase
      .from('profiles')
      .update({
        college: pod.toUpperCase(),
        college_pod: pod,
        college_domain: domain,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  } catch {
    /* optional */
  }

  return { ok: true, next: '/home' }
}
