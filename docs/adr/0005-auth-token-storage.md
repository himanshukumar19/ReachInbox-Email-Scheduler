# Auth Token Storage via JWT in URL and localStorage

Auth uses Passport GoogleStrategy → JWT (7-day expiry) → redirect with `?token=` → frontend stores in `localStorage` → `Authorization: Bearer` on `/me`. Token-in-URL plus `localStorage` is XSS-reachable and transiently sits in browser history at the callback URL; acceptable for a 48h assignment, not production-appropriate. The callback page strips the token from the URL/history right after reading it so it doesn't persist in back-button history.
