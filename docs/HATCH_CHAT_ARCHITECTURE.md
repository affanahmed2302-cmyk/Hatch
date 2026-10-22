# HATCH CHAT ARCHITECTURE

## Routes (production)
| Screen | Path | Component |
|--------|------|-----------|
| Inbox | `/inbox` | `src/app/inbox/page.tsx` |
| Conversation | `/chat/[id]` | `src/app/chat/[id]/page.tsx` |
| Discover (new chat) | `/discover` | existing |
| Skill match | `/match` | existing |

Nav label: **Inbox** → `/inbox`.

## Data
- Messages: Supabase `messages` (`sender_id`, `receiver_id`, `content`, `read_at`, `created_at`)
- Identity: `profiles` via peer id
- Block isolation: `user_blocks` + `getIsolationSet`
- Realtime: postgres_changes INSERT on `messages`

## Client prefs (localStorage, personal)
| Key | Module | Purpose |
|-----|--------|---------|
| `hatch_pinned_chats` | `pins.ts` | Pin order |
| `hatch_muted_chats` | `chatPrefs.ts` | Mute notification ping |
| `hatch_archived_chats` | `chatPrefs.ts` | Archive filter |
| `hatch_force_unread` | `chatPrefs.ts` | Mark unread |
| `hatch_chat_theme_v1` | `chatTheme.ts` | Personal theme |

## Intentionally not faked
- Group chats / Requests tabs — no backend groups yet
- Online status only via `last_seen` + `isRecentlyOnline`
- No E2E encryption claim
