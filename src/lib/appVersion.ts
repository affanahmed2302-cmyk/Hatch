export const APP_VERSION = '5.23.0'
export const APP_BUILD = '2026-10-15-rescue-p1-nav-confess-circles'

export async function checkForAppUpdate(): Promise<{ updated: boolean; message: string }> {
  if (typeof window === 'undefined') return { updated: false, message: 'Not in browser' }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((r) => r.update().catch(() => {})))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((k) => caches.delete(k)))
    }
    localStorage.setItem('hatch_app_version', APP_VERSION)
    return { updated: true, message: `On ${APP_VERSION}. Reloading…` }
  } catch (e: any) {
    return { updated: false, message: e?.message || 'Failed' }
  }
}
