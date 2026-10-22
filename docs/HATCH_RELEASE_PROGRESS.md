# HATCH Release Progress

**Updated:** 2026-10-22

## Done this release pass
- [x] Production smoke (landing, login, headers)
- [x] Document audit / matrix / fix log
- [x] Pulse author_id fix (prior)
- [x] Connections + confessions API (prior)
- [x] Viewport a11y fix
- [x] Login college-mail message clarity

## Blocked on human / external
- [ ] Google OAuth Console + Supabase provider match (founder)
- [ ] Run `sql/connections_secure.sql` in Supabase (founder)
- [ ] Logged-in E2E on real .ac.in account

## Not ready to claim “production-ready for mass invite” until
1. OAuth signup succeeds for a new BMSCE student account
2. Connect + chat + pulse exercised once live
3. At least minimal automated smoke tests exist

## Live
https://hatch-primeora.vercel.app
