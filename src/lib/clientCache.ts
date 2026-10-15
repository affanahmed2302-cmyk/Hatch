/**
 * Session memory cache — stops full reload feel when switching Home ↔ Profile.
 * Data lives for the tab session only (not permanent disk bloat).
 */

const mem = new Map<string, { t: number; v: unknown }>()
const DEFAULT_TTL = 60_000

export function cacheGet<T>(key: string, ttlMs = DEFAULT_TTL): T | null {
  const row = mem.get(key)
  if (!row) return null
  if (Date.now() - row.t > ttlMs) {
    mem.delete(key)
    return null
  }
  return row.v as T
}

export function cacheSet(key: string, value: unknown) {
  mem.set(key, { t: Date.now(), v: value })
}

export function cacheInvalidate(prefix?: string) {
  if (!prefix) {
    mem.clear()
    return
  }
  for (const k of mem.keys()) {
    if (k.startsWith(prefix)) mem.delete(k)
  }
}
