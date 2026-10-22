# CHAT ROOT CAUSE — Evidence-based

**Date:** 2026-10-22  
**Production:** https://hatch-primeora.vercel.app  
**Chats list route:** `/inbox` (Nav label "Inbox")  
**Conversation route:** `/chat/[id]`

## Trace
1. Nav → `/inbox` (`src/components/Nav.tsx`)
2. List → `src/app/inbox/page.tsx`
3. Thread → `src/app/chat/[id]/page.tsx`
4. No feature flag hides these routes
5. Unauth `/inbox` redirects to `/login` (live browser 2026-10-22)

## What was / was not deployed before this fix

| Work | On stable-plus? | In production chat UI? |
|------|-----------------|------------------------|
| Avatar component | Yes | Inbox only (after 5f2efa8) |
| chatTheme.ts library | Yes | **No — chat page never imported it** |
| Full chat redesign + themes | Local artifact only | **No** |
| Inbox Avatar swap | Yes, deployed | Yes, but subtle |

## Root cause
1. **Primary:** Conversation UI + theme selector were never committed to `src/app/chat/[id]/page.tsx`. Production chat had no Avatar import and no chatTheme usage (raw GitHub verified 2026-10-22).
2. **Secondary:** Inbox changes that did deploy were incremental; overall layout still looked similar.
3. **Not the cause:** Wrong branch, wrong Vercel project, or alternate hidden chat route.

## Fix applied
Commit `67135ecd` replaces `src/app/chat/[id]/page.tsx` with Avatar header, profile link, Theme selector (7 themes, localStorage personal), real messages from Supabase.
