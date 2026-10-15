export const APP_VERSION = '5.21.0'
export const APP_BUILD = '2026-10-15-ux-dedupe-splash'

export async function checkForAppUpdate(): Promise<{
  updated: boolean
  message: string
}> {
  if (typeof window === 'undefined') {
    return { updated: false, message: 'Not in browser' }
  }

  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update().catch(() => {})))
      for (const r of regs) {
        if (r.waiting) r.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }

    localStorage.setItem('hatch_app_version', APP_VERSION)
    localStorage.setItem('hatch_app_build', APP_BUILD)

    return {
      updated: true,
      message: `You're on ${APP_VERSION}. Cache cleared — reloading…`,
    }
  } catch (e: any) {
    return { updated: false, message: e?.message || 'Update check failed' }
  }
}
