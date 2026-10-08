import { supabase, ensureProfile } from './supabase'
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

/** After OAuth: any Google account is allowed (Gmail, college, etc.) */
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

  await ensureProfile(user.id, email)

  // Optional: tag college if institutional domain; personal Gmail still OK
  try {
    const pod = collegePodFromEmail(email)
    const domain = extractDomain(email)
    await supabase
      .from('profiles')
      .update({
        college: pod ? pod.toUpperCase() : null,
        college_pod: pod || null,
        college_domain: domain || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
  } catch {
    /* optional columns */
  }

  return { ok: true, next: '/home' }
}
