export function appOrigin() {
  if (typeof window === 'undefined') return 'https://hatch-primeora.vercel.app'
  return window.location.origin
}

export function inviteUrl(ref?: string) {
  const base = appOrigin() + '/signup'
  if (ref) return base + '?ref=' + encodeURIComponent(ref)
  return base
}

export async function shareInvite(opts?: { title?: string; text?: string; ref?: string }) {
  const url = inviteUrl(opts?.ref)
  const title = opts?.title || 'Hatch — BMS campus network'
  const text =
    opts?.text ||
    "We're on Hatch — find teammates, chat, I'm Free on campus. Join with college email:"
  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({ title, text, url })
      return { ok: true as const, method: 'share' as const }
    }
  } catch {
    /* cancelled */
  }
  try {
    await navigator.clipboard.writeText(text + ' ' + url)
    return { ok: true as const, method: 'clipboard' as const }
  } catch {
    return { ok: false as const, method: 'none' as const, url }
  }
}
