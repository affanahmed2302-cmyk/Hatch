import { supabase, ensureProfile, SUPER_ADMINS, needsTermsAcceptance } from './supabase'
import { collegePodFromEmail, extractDomain, isAllowedStudentEmail } from './college'

/** Start Google OAuth — student .ac.in / .edu only (enforced after redirect too) */
export async function signInWithGoogle(redirectPath = '/auth/callback') {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}${redirectPath}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
        // Hint Google account picker — hard block is still in finalizeOAuthSession
        hd: '*',
      },
    },
  })
  if (error) return { ok: false as const, error: error.message }
  return { ok: true as const, url: data.url, error: null }
}

/** After OAuth: ONLY institutional emails (.ac.in / .edu / known college). Super-admins exempt. */
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
  const isAdmin = SUPER_ADMINS.includes(email)
  const gate = isAllowedStudentEmail(email)

  if (!isAdmin && !gate.ok) {
    await supabase.auth.signOut()
    return {
      ok: false,
      error:
        gate.error ||
        'Use your college Google account (.ac.in / .edu). Personal Gmail is blocked to stop spam.',
    }
  }

  await ensureProfile(user.id, email)

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

  try {
    if (await needsTermsAcceptance(user.id)) {
      return { ok: true, next: '/terms' }
    }
  } catch {
    /* */
  }

  return { ok: true, next: '/home' }
}
