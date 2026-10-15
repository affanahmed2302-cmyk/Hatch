import { supabase, ensureProfile, SUPER_ADMINS, needsTermsAcceptance } from './supabase'
import { collegePodFromEmail, extractDomain, isAllowedStudentEmail } from './college'

/**
 * Google OAuth for college students.
 * - Never use hd:'*' (invalid — breaks some Google flows)
 * - Support both PKCE ?code= and implicit #access_token=
 * - Clear errors for new users when session exchange fails
 */
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
      skipBrowserRedirect: false,
    },
  })
  if (error) return { ok: false as const, error: error.message }
  // Browser should redirect; if not, open url
  if (data?.url && typeof window !== 'undefined') {
    window.location.assign(data.url)
  }
  return { ok: true as const, url: data?.url || null, error: null }
}

function oauthErrorFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const u = new URL(window.location.href)
    const err =
      u.searchParams.get('error_description') ||
      u.searchParams.get('error') ||
      u.hash.match(/error_description=([^&]+)/)?.[1]
    if (!err) return null
    return decodeURIComponent(err.replace(/\+/g, ' '))
  } catch {
    return null
  }
}

export async function finalizeOAuthSession(): Promise<{
  ok: boolean
  error?: string
  next?: string
}> {
  const urlErr = oauthErrorFromUrl()
  if (urlErr) {
    return {
      ok: false,
      error:
        urlErr.includes('access_denied')
          ? 'Google sign-in cancelled'
          : `Google: ${urlErr}`,
    }
  }

  try {
    if (typeof window !== 'undefined') {
      const href = window.location.href
      // PKCE flow (preferred)
      if (href.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(href)
        if (error) {
          // Retry once with only search string
          const { error: e2 } = await supabase.auth.exchangeCodeForSession(
            window.location.origin + window.location.pathname + window.location.search
          )
          if (e2) {
            return {
              ok: false,
              error:
                e2.message ||
                'Could not finish Google login. In Supabase → Auth → URL Config, add: ' +
                  window.location.origin +
                  '/auth/callback',
            }
          }
        }
      }
      // Implicit / hash tokens (older clients)
      if (href.includes('access_token=')) {
        await supabase.auth.getSession()
      }
    }
  } catch (e: any) {
    return {
      ok: false,
      error: e?.message || 'Session exchange failed — try login again',
    }
  }

  // Wait briefly for session cookie to settle (new users)
  let user = null as { id: string; email?: string | null } | null
  for (let i = 0; i < 5; i++) {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      user = session.user
      break
    }
    await new Promise((r) => setTimeout(r, 200))
  }

  if (!user?.email) {
    return {
      ok: false,
      error:
        'Google sign-in did not return a session. Check Supabase Auth → Providers → Google is ON, and Redirect URLs include this site /auth/callback.',
    }
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
        'Use your college Google (.ac.in / .edu). Personal Gmail is blocked.',
    }
  }

  try {
    await ensureProfile(user.id, email)
  } catch (e: any) {
    // New user profile insert can fail RLS — still try to continue to terms/home
    console.warn('ensureProfile', e?.message)
  }

  try {
    const pod = collegePodFromEmail(email)
    const domain = extractDomain(email)
    await supabase
      .from('profiles')
      .update({
        email,
        college: pod ? pod.toUpperCase() : null,
        college_pod: pod || null,
        college_domain: domain || null,
        domain_verified: true,
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
    /* first-time: send to terms */
    return { ok: true, next: '/terms' }
  }

  return { ok: true, next: '/home' }
}
