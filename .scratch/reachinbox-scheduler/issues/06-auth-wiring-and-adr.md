# 06 — Auth wiring + ADR 0005 (Header, logout, token scrub)

**What to build:** Header shows the real Authenticated User (not hardcoded Demo User) via `GET /api/auth/me`, logout clears the session, and the callback page scrubs `?token=` from URL/history; the JWT storage trade-off is documented.

**Blocked by:** None — can start immediately (parallel with 01/02/03)

**Status:** ready-for-agent

- [ ] `Header` calls `/api/auth/me` with stored `Bearer` token (via `lib/api.ts` interceptor), renders real `name/email/avatar` replacing hardcoded `Demo User`
- [ ] Logout clears `localStorage` token and redirects to `/api/auth/google` (or landing)
- [ ] `app/auth/callback/page.tsx` reads `?token=`, writes `localStorage`, does `history.replaceState` to strip token from URL/history before redirect to `/`
- [ ] Write `docs/adr/0005-auth-token-storage.md`: Passport → JWT 7d → `?token=` → `localStorage` → `Bearer`; token-in-URL + `localStorage` is XSS-reachable and in history, acceptable for 48h assignment, mitigated by stripping
- [ ] Adds `CONTEXT.md: Authenticated User`; demoable: log in → see real profile in header → log out → token gone
