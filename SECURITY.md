# Hatch security posture

## What we locked

1. **RLS** (`hatch_security.sql`) — clients cannot:
   - Self-grant memberships / premium
   - Edit other users' profiles or privileged fields (is_premium, rep_score)
   - Create clubs or grant badges (super-admin JWT email only)
   - Read others' DMs or secret confessions
   - Write club posts unless club admin

2. **API routes** — Razorpay + coupon redeem require:
   - Valid Bearer access token
   - `user_id` must match session (no spoofing)
   - Rate limits
   - HMAC signature check on payments
   - Membership writes only via `SUPABASE_SERVICE_ROLE_KEY` on server

3. **HTTP hardening** — CSP, X-Frame-Options DENY, nosniff, scanner path blocks

## Required Vercel env (never commit)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # secret — server only
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=         # secret — server only
NEXT_PUBLIC_RAZORPAY_KEY_ID= # public key only
```

## Founder checklist

1. Run `hatch_security.sql` in Supabase
2. Add `SUPABASE_SERVICE_ROLE_KEY` on Vercel (Project Settings → Env)
3. Auth → enable email confirm if desired; set redirect URLs only to hatch-primeora.vercel.app
4. Rotate any key ever pasted in chat/screenshots
5. Never put service role or Razorpay secret in client code

## Honest limit

No app is unhackable. This stack stops common abuse: free premium injection, cross-user data reads, admin impersonation from the browser, clickjacking, and naive payment forgery. Keep dependencies updated and monitor Supabase auth logs.
