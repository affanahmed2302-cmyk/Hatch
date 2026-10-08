export const APP_VERSION = '5.13.0'
export const APP_BUILD = '2026-10-08'

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
        if (r.waiting) {
          r.waiting.postMessage({ type: 'SKIP_WAITING' })
        }
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }

    const prev = localStorage.getItem('hatch_app_version')
    localStorage.setItem('hatch_app_version', APP_VERSION)
    localStorage.setItem('hatch_app_build', APP_BUILD)

    if (prev && prev !== APP_VERSION) {
      return {
        updated: true,
        message: `Updated to ${APP_VERSION}. Reloading…`,
      }
    }
    return {
      updated: true,
      message: `You're on ${APP_VERSION}. Cache cleared — reloading fresh build…`,
    }
  } catch (e: any) {
    return { updated: false, message: e?.message || 'Update check failed' }
  }
}
