# HATCH Release Test Matrix

Statuses: PASS | FAIL | BLOCKED | NOT TESTED | SKIP

| # | Journey | Status | Evidence |
|---|---------|--------|----------|
| 1 | Open production URL | PASS | HTTP 200 + mobile screenshot 2026-10-22 |
| 2 | Landing CTA Enter Hatch / Sign in visible | PASS | Screenshot |
| 3 | Open /login | PASS | Screenshot |
| 4 | Unauth /discover redirects login | PASS | Browser navigation |
| 5 | Security headers present | PASS | Response headers |
| 6 | Google OAuth complete signup | BLOCKED | Requires operator OAuth console verification |
| 7 | Email+password login with .ac.in | NOT TESTED | No isolated test account in CI |
| 8 | Wrong email shows college-only message | NOT TESTED | Code path present |
| 9 | Pulse create/list | NOT TESTED | author_id fix deployed |
| 10 | Connect request accept | NOT TESTED | helpers shipped |
| 11 | Chat send/persist | NOT TESTED | messages table exists |
| 12 | Confessions window enforce | NOT TESTED | API route exists |
| 13 | Hostel discovery | NOT TESTED | |
| 14 | Logout / session refresh | NOT TESTED | |
| 15 | Mobile 390px layout | PASS | Landing/login screenshots |
| 16 | Automated unit/e2e suite | SKIP | No framework configured |

**Critical journeys verified without auth:** 1–5, 15.  
**Critical journeys still requiring logged-in human test:** 6–14.
