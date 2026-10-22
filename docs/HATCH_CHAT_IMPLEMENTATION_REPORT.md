# HATCH CHAT 2.0 IMPLEMENTATION REPORT

## Stages delivered

### Stage 1 — Foundation — IMPLEMENTED
- Real `/inbox` + `/chat/[id]` routes upgraded
- Avatars + displayName from profiles
- Send/load from Supabase; optimistic UI + fail recovery
- Themes on conversation screen

### Stage 2 — Organisation — IMPLEMENTED (client prefs)
- Search (name, username, last message)
- Filters: All | Unread | Archived
- Pin / Mute / Archive / Mark unread (inbox + chat overflow)

### Stage 3 — Personalisation — IMPLEMENTED
- 7 Hatch themes, personal localStorage

### Stage 4–7 — NOT IMPLEMENTED / BLOCKED
- Attachments, voice, reactions, groups: need schema/storage
- Campus links: Discover + Match from empty state

## Files
- src/lib/chatPrefs.ts
- src/app/inbox/page.tsx
- src/app/chat/[id]/page.tsx
- docs/HATCH_CHAT_*
