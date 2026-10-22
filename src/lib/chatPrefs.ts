/** Local conversation organisation prefs (mute / archive / mark unread). */
const MUTE = "hatch_muted_chats";
const ARCH = "hatch_archived_chats";
const UNREAD = "hatch_force_unread";

function read(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function write(key: string, ids: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify([...new Set(ids)]));
  } catch {
    /* */
  }
}

export function getMuted(): string[] {
  return read(MUTE);
}
export function isMuted(peerId: string) {
  return getMuted().includes(peerId);
}
export function toggleMute(peerId: string) {
  const s = new Set(getMuted());
  if (s.has(peerId)) s.delete(peerId);
  else s.add(peerId);
  write(MUTE, [...s]);
  return s.has(peerId);
}

export function getArchived(): string[] {
  return read(ARCH);
}
export function isArchived(peerId: string) {
  return getArchived().includes(peerId);
}
export function toggleArchive(peerId: string) {
  const s = new Set(getArchived());
  if (s.has(peerId)) s.delete(peerId);
  else s.add(peerId);
  write(ARCH, [...s]);
  return s.has(peerId);
}

export function getForceUnread(): string[] {
  return read(UNREAD);
}
export function isForceUnread(peerId: string) {
  return getForceUnread().includes(peerId);
}
export function markForceUnread(peerId: string) {
  write(UNREAD, [...getForceUnread(), peerId]);
}
export function clearForceUnread(peerId: string) {
  write(
    UNREAD,
    getForceUnread().filter((id) => id !== peerId)
  );
}
