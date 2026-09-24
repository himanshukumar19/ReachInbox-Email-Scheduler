Spec review — Spec axis only — commit d0b7355 vs HEAD~1 (47acc669)

(a) Missing / partial
- Spec line: "- [ ] Adds CONTEXT.md: Authenticated User; demoable: log in → see real profile in header → log out → token gone" — PARTIAL. `CONTEXT.md` exists with the term (line 11: "The Google-authenticated identity...") but the required demo flow description ("demoable: log in → see real profile... log out → token gone") is absent.

(b) Behaviour not asked for (scope creep)
- Unrelated build artifacts in diff: `frontend/next-env.d.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.tsbuildinfo`, `package-lock.json`, `package.json`. No behavioural scope creep.

(c) Implemented but wrong
- None found. All behavioural requirements match spec.

Specific checks (quoted spec lines):
- "Header calls /api/auth/me with stored Bearer token (via lib/api.ts interceptor), renders real name/email/avatar replacing hardcoded Demo User" — IMPLEMENTED. `Header.tsx` uses `useQuery(fetchMe)` with `lib/api.ts` interceptor (`client.interceptors.request` attaches Bearer token from `localStorage`). No "Demo User" remains; renders `me.data?.name/email/avatar`.
- "Logout clears localStorage token and redirects to /api/auth/google (or landing)" — IMPLEMENTED. `page.tsx` `handleLogout`: `localStorage.removeItem("token")`; `window.location.href` to `/api/auth/google`.
- "app/auth/callback/page.tsx reads ?token=, writes localStorage, does history.replaceState to strip token from URL/history before redirect to /" — IMPLEMENTED. Uses `URLSearchParams`, `localStorage.setItem`, `window.history.replaceState({}, "", "/")`, then `window.location.replace("/")`. Token stripped before redirect.
- "Write docs/adr/0005-auth-token-storage.md: Passport → JWT 7d → ?token= → localStorage → Bearer; token-in-URL + localStorage is XSS-reachable and in history, acceptable for 48h assignment, mitigated by stripping" — IMPLEMENTED. ADR contains full chain (§Storage chain) and trade-off (§Trade-off) covering XSS-reachable, history, 48h acceptable, mitigation by stripping.
- "Adds CONTEXT.md: Authenticated User; demoable: ..." — PARTIAL (see a above).

Word count: ~320. No wrong behavioural implementations detected.
