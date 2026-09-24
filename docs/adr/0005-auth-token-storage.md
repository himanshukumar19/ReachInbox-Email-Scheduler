# Auth Token Storage via JWT in URL and localStorage

Auth uses Passport GoogleStrategy → JWT (7-day expiry) → redirect with `?token=` → frontend stores in `localStorage` → `Authorization: Bearer` on `/me`. Token-in-URL plus `localStorage` is XSS-reachable and transiently sits in browser history at the callback URL; acceptable for a 48h assignment, not production-appropriate. The callback page strips the token from the URL/history right after reading it so it doesn't persist in back-button history.

## Storage chain

1. Passport authenticates Google OAuth (`/api/auth/google`).
2. `jwt.sign(user, JWT_SECRET, { expiresIn: "7d" })` creates token.
3. Redirect to `/auth/callback?token=<jwt>`.
4. Callback reads `?token=`, writes `localStorage.setItem("token", t)`.
5. `history.replaceState` strips query params; redirect to `/`.
6. Header fetches `/api/auth/me` with `Bearer` interceptor; renders real profile.
7. Logout removes token and redirects to `/api/auth/google`.

## Trade-off

- Token in URL is visible to server logs, browser history, and referrer headers.
- `localStorage` is accessible to any XSS injection on the domain.
- Mitigation for assignment: strip URL immediately after read; do not persist token in server session; use short 7-day expiry.
