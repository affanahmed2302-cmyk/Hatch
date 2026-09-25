const PIN_KEY = 'mesh_chat_lock_pin'
const UNLOCK_KEY = 'mesh_chat_session_unlocked'
const LOCKED_CHATS_KEY = 'mesh_locked_chat_ids'
const WALLPAPER_KEY = 'mesh_chat_wallpaper'
const DELETED_FOR_ME_KEY = 'mesh_deleted_for_me'
const NOTIFY_KEY = 'mesh_daily_reminders'

/** True only when user has set a PIN (lock feature ON). */
export function hasChatLock() {
  return typeof window !== 'undefined' && !!localStorage.getItem(PIN_KEY)
}

export function setChatLockPin(pin: string) {
  localStorage.setItem(PIN_KEY, pin)
  sessionStorage.removeItem(UNLOCK_KEY)
}

export function clearChatLock() {
  localStorage.removeItem(PIN_KEY)
  sessionStorage.removeItem(UNLOCK_KEY)
}

export function isChatUnlocked() {
  if (!hasChatLock()) return true
  return sessionStorage.getItem(UNLOCK_KEY) === '1'
}

export function unlockChat(pin: string) {
  if (localStorage.getItem(PIN_KEY) !== pin) return false
  sessionStorage.setItem(UNLOCK_KEY, '1')
  return true
}

export function verifyPin(pin: string) {
  return localStorage.getItem(PIN_KEY) === pin
}

export function lockChatNow() {
  sessionStorage.removeItem(UNLOCK_KEY)
}

export function getLockedChatIds(): string[] {
  try { return JSON.parse(localStorage.getItem(LOCKED_CHATS_KEY) || '[]') } catch { return [] }
}

export function setChatLocked(peerId: string, locked: boolean) {
  const ids = new Set(getLockedChatIds())
  if (locked) ids.add(peerId)
  else ids.delete(peerId)
  localStorage.setItem(LOCKED_CHATS_KEY, JSON.stringify([...ids]))
}

export function isChatLocked(peerId: string) {
  if (!hasChatLock()) return false
  return getLockedChatIds().includes(peerId)
}

export function getWallpaperId() {
  return localStorage.getItem(WALLPAPER_KEY) || 'default'
}

export function setWallpaperId(id: string) {
  localStorage.setItem(WALLPAPER_KEY, id)
}

export function getDeletedForMe(): string[] {
  try { return JSON.parse(localStorage.getItem(DELETED_FOR_ME_KEY) || '[]') } catch { return [] }
}

export function markDeletedForMe(msgId: string) {
  const ids = new Set(getDeletedForMe())
  ids.add(msgId)
  localStorage.setItem(DELETED_FOR_ME_KEY, JSON.stringify([...ids]))
}

export function getDailyReminders(): boolean {
  return localStorage.getItem(NOTIFY_KEY) !== '0'
}

export function setDailyReminders(on: boolean) {
  localStorage.setItem(NOTIFY_KEY, on ? '1' : '0')
}
