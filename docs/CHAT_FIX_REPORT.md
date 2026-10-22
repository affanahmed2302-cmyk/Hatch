# CHAT FIX REPORT

**Date:** 2026-10-22

## 1. Root cause
See `docs/CHAT_ROOT_CAUSE.md`. Themes and conversation redesign never landed on the real `/chat/[id]` file.

## 2. Files changed
- `src/app/chat/[id]/page.tsx` — full conversation UI + themes
- `src/lib/chatTheme.ts` — already present; now consumed
- `src/components/Avatar.tsx` — already present; used in chat header
- `src/app/inbox/page.tsx` — earlier Avatar + names (5f2efa8)
- `docs/CHAT_ROOT_CAUSE.md`, `docs/CHAT_FIX_REPORT.md`

## 3. Visible changes (after deploy + login)
- Conversation header: photo/initials, display name, @username, link to `/u/[id]`
- **Theme** button: 7 Hatch themes; bubbles and background change immediately
- Themes persist via localStorage (personal only)
- Messages still from `messages` table; realtime INSERT subscription unchanged
- Inbox: Avatar rows + profile names (not message author IDs)

## 4. Data connection
- Peer: `profiles` by `peerId` from URL
- Messages: `sender_id` / `receiver_id` = auth user + peer
- Names: `displayName(profile)` never uses UUID as label when name exists
- Avatar: `profile.avatar_url` or initials from name

## 5. Tests
| Check | Result |
|-------|--------|
| Route `/inbox` exists, redirects unauth → login | PASS (live browser) |
| Source chat page imports Avatar + chatTheme | PASS (post-commit raw) |
| Logged-in send message / theme persist | NOT TESTED (no auth session in agent browser) |
| lint/typecheck suite | NOT RUN (no test script in package.json) |

## 6. Commit / deploy
- Fix commit: `67135ecd` on `stable-plus`
- Deploy: triggered after this report batch

## 7. Limitations
- Themes are client-only (not shared with peer) — intentional
- No group chats, typing indicators, or read receipts beyond existing `read_at` mark
- Must be logged in to see Chats UI

## 8. Production check
- Live URL opened without session → login (expected)
- Post-deploy: hard-refresh after login to `/inbox` then open a chat; use **Theme**
