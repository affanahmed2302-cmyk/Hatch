/** Client + shared text sanitization — strip HTML/script vectors before display or insert */

const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

export function stripTags(input: string): string {
  return String(input || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(CONTROL, "")
    .trim();
}

export function sanitizePlain(input: string, maxLen = 500): string {
  let s = stripTags(input);
  // neutralize common XSS payloads even without tags
  s = s
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .replace(/[<>]/g, "");
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

export function sanitizeUrl(input: string): string | null {
  const s = String(input || "").trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function clampInt(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}
