const KEY = 'hatch_pinned_chats'

export function getPinned(): string[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

export function togglePin(peerId: string) {
  const set = new Set(getPinned())
  if (set.has(peerId)) set.delete(peerId)
  else set.add(peerId)
  localStorage.setItem(KEY, JSON.stringify([...set]))
  return set.has(peerId)
}

export function isPinned(peerId: string) {
  return getPinned().includes(peerId)
}
