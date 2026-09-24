# Spec: ReachInbox Email Scheduler — Durable Scheduling + Dashboard

## Problem Statement

As a user of a sales outreach tool, I need to schedule emails to many Recipients for a future time, see what is Scheduled vs what has been Sent (including failures), and trust that the system will not lose or duplicate sends if the server restarts, even when many emails are queued at once or an hourly sending limit is hit. Today the brief's hard constraints make this non-trivial: no cron, idempotency is required, rate limiting must work across multiple workers via Redis, and the dashboard must match the Figma with real Google OAuth — otherwise evaluators will reject the submission on reliability and fidelity, not just features.

## Solution

A TypeScript monorepo: Express API + BullMQ (Redis) delayed jobs with `jobId = EmailId` + Postgres (Prisma) as the durable source of truth + Ethereal SMTP via a `MailProvider` Strategy, and a Next.js dashboard (Tailwind, TanStack Query, PapaParse, sonner) with real Google OAuth → JWT → `Authenticated User` header. The API writes `Scheduled Email` rows and enqueues bulk jobs with `Batch Stagger`; the Worker enforces a `Send Throttle` via BullMQ limiter + per-`Sender` Redis `INCR`/`EXPIRE` and `moveToDelayed` on limit, checking `findById` status before send for idempotency. BullMQ Redis persistence is the sole restart recovery — no DB re-seed. `Recipient` CSV import is defensive (proper email regex, case-insensitive dedup, valid-count toast, zero-guard). `Sent Emails` is `status ∈ {sent, failed}` under the `Sent` tab with `updatedAt` as the displayed time for failures. All work is gated by the `Definition of Done` (SOLID, Repository/Strategy/Singleton, four layering rules, no-comments/no-any).

## User Stories

1. As an Authenticated User, I want to sign in with real Google OAuth and be redirected to the dashboard, so that I know the login is not mocked.
2. As an Authenticated User, I want to see my name, email, and avatar in the header after login, so that I know who is signed in.
3. As an Authenticated User, I want to log out and clear my session, so that the next user does not see my data.
4. As an Authenticated User, I want to see a dashboard with header + Scheduled/Sent tabs + Compose New Email button, so that I can navigate the app as in the Figma.
5. As an Authenticated User, I want to open a Compose modal with subject, body, sender email, scheduled start time, Batch Stagger delay, and CSV upload, so that I can create a campaign in one place.
6. As an Authenticated User, I want the Compose delay-between-emails (ms) to default to 1000 and be editable, so that I can control spreading of a large batch without changing code.
7. As an Authenticated User, I want to upload a CSV/text file of Recipients and see how many valid unique addresses were found, so that I know what will be sent.
8. As an Authenticated User, I want invalid rows in the CSV to be skipped silently (not crash the upload), so that one bad row does not block the campaign.
9. As an Authenticated User, I want duplicate Recipient addresses (case-insensitive) to be deduped and the valid count to reflect uniques, so that no one is emailed twice from the same upload.
10. As an Authenticated User, I want the Schedule button to be blocked when zero valid Recipients are found, so that I do not get a backend 400 for an empty batch.
11. As an Authenticated User, I want to schedule emails for a future `scheduledAt` time, so that they send later not immediately.
12. As an Authenticated User, I want a large batch (e.g. 1000 Recipients) to be accepted without the API blocking on individual sends, so that the request returns quickly and the Worker spreads sending.
13. As an Authenticated User, I want each Recipient in a batch to have a staggered `sendAt = base + i * delayBetweenMs`, so that 1000-at-once does not thundering-herd Ethereal.
14. As an operator, I want the API to persist each email as a Scheduled Email row before enqueuing, so that the DB is the source of truth if the queue is inspected.
15. As an operator, I want each BullMQ job to use `jobId = EmailId` (client-generated UUID), so that duplicate enqueues are deduped by BullMQ.
16. As an operator, I want the Worker to check the DB `findById` status and skip if already `sent`, so that a job re-running after a crash mid-send does not double-send (idempotency guard).
17. As an operator, I want the system to survive a restart — kill the backend, restart, and have future Scheduled Emails still send on time with no duplicates and no loss — via BullMQ Redis persistence, so that restarts do not require manual re-queueing.
18. As an operator, I want no code path that re-seeds jobs from `status=scheduled` on boot, so that the naive duplicate-enqueue bug cannot occur.
19. As an operator, I want a minimum gap between individual sends enforced by the Worker's BullMQ `limiter: { max: 1, duration: DELAY_BETWEEN_SENDS_MS }` across all concurrency slots, so that the gap holds even with `WORKER_CONCURRENCY > 1`.
20. As an operator, I want `WORKER_CONCURRENCY` (env, default 5) to govern how many jobs can be mid-flight (DB/rate-limiter I/O) independent of the send throttle, so that I/O parallelism does not break pacing.
21. As an operator, I want per-Sender hourly rate limiting via Redis `INCR`/`EXPIRE 3600` on key `rate:<Sender>:<hour>`, so that the count is correct across multiple worker processes.
22. As an operator, I want the hourly limit value to be the single global env `MAX_EMAILS_PER_HOUR` (default 50) applied per-Sender key, not a per-request field, so that there is one limit path.
23. As an operator, I want a job that hits the hourly limit to be rescheduled with `job.moveToDelayed(msUntilNextHour())` and never dropped or failed, so that no Recipient is silently lost.
24. As an operator, I want `rateLimiter/hourly-limiter.ts` to have zero Express/BullMQ imports and be unit-testable standalone, so that the limit logic can be tested without the web stack.
25. As an Authenticated User, I want the Scheduled Emails table to show email, subject, scheduled time, status with loading and empty states, so that I know what is pending.
26. As an Authenticated User, I want the Sent Emails table to show email, subject, sent time (or `updatedAt` for failures), status `sent`/`failed` with loading and empty states, so that I can audit outcomes.
27. As an Authenticated User, I want both tables to be the same reusable `EmailTable` component, so that the UI is consistent.
28. As an Authenticated User, I want all API responses and React props to be typed (no `any`), so that type errors surface at build time.
29. As an Authenticated User, I want basic error/success feedback via toasts (sonner), so that I know if scheduling or fetching failed.
30. As an evaluator, I want `POST /api/emails/schedule`, `GET /api/emails/scheduled`, `GET /api/emails/sent`, `GET /api/auth/google` and `/api/auth/google/callback` documented and working, so that I can test via API and UI.
31. As an evaluator, I want the repo to have Docker Compose for Redis (appendonly) + Postgres, one command to start both, so that the setup is reproducible.
32. As an evaluator, I want a README covering run instructions, Ethereal setup, env variables, architecture (scheduling, restart, rate limiting/concurrency), and a feature checklist mapped to brief §8, so that I can run and grade without guessing.
33. As an evaluator, I want a demo video (max 5 min) showing scheduling, dashboard tabs, restart (stop→start→on-time-no-duplicates) and a brief rate-limit-under-load clip, so that hard constraints are visibly proven.
34. As an evaluator, I want a trade-offs note covering: JWT-in-localStorage, UUID-over-autoincrement for bulk, Redis-wipe stranded rows, per-Sender env limit, and limiter-vs-concurrency decoupling, so that intentional decisions are not mistaken for omissions.

## Implementation Decisions

- **Ubiquitous language is `CONTEXT.md`**: `Recipient`, `Authenticated User`, `Sent Emails` (`status ∈ {sent,failed}`, `Sent` tab label, failed time = `updatedAt`), `Batch Stagger` (user-configurable `delayBetweenMs` in Compose, `sendAt = base + i * delayBetweenMs`), and `Definition of Done` as the per-ticket gate. No `Lead`/`emails`/`address` for Recipient; no renaming of the `Sent` tab.
- **Persistence and idempotency**: Postgres is the durable source of truth; BullMQ Redis persistence is the sole restart recovery (no DB re-seed on boot). Enqueue uses `jobId = EmailId`; the Worker checks `repository.findById` and returns if `status === "sent"` before send. Known limitation — if Redis is wiped entirely, `status=scheduled` rows have no job and won't send; disclosed, not reconciled in this build.
- **Bulk enqueue for 1000+**: `POST /api/emails/schedule` builds rows with client-generated `EmailId` via `crypto.randomUUID()`, then `repository.createMany` (`prisma.email.createMany`) + `emailQueue.addBulk` (each with `jobId = EmailId`). The handler still awaits both bulk calls before 201 — satisfies "not blocking on individual per-Recipient work" without fire-and-forget error semantics. `Batch Stagger` math is preserved per job in the bulk arrays. Trade-off is UUID PK vs DB auto-increment, required because `createMany` does not return inserted ids.
- **Concurrency and Send Throttle are decoupled**: `WORKER_CONCURRENCY` (env) governs mid-flight jobs; `Send Throttle` is a BullMQ Worker-level limiter `limiter: { max: 1, duration: DELAY_BETWEEN_SENDS_MS }`, not a per-job `setTimeout` sleep. The former controls I/O parallelism; the latter enforces a true minimum gap between sends across concurrent slots.
- **Rate limiting**: per-Sender, per-hour via Redis `INCR`/`EXPIRE 3600` on `rate:<Sender>:<hour>` (`hourWindowKey` from `ISO 2025-...T13`), compared to `MAX_EMAILS_PER_HOUR` (env). `checkAndIncrement` lives in `rateLimiter/` isolated from Express/BullMQ. On breach, `job.moveToDelayed(msUntilNextHour())` — never drop/fail. `hourlyLimit` per-request field is removed from the API and UI because it was dead (accepted but ignored); this build has one limit path.
- **Recipient CSV ingestion**: `ComposeModal` uses PapaParse, validates each cell with proper email regex (not bare `/@/`), normalizes to lower-case, dedups via `Set`, toasts deduped valid count, shows count + red "Add at least one valid Recipient" when zero, and disables Schedule when zero so the backend `z.array(email).min(1)` 400 is never hit via the happy path.
- **Compose fields**: subject, body, sender email, `scheduledAt` (`datetime-local` → ISO), `delayBetweenMs` numeric input default 1000, CSV upload, Schedule. No hourly-limit input (per Q2). `SchedulePayload` is typed; all props/responses are typed, no `any`.
- **Auth**: Passport Google OAuth20 strategy → find-or-create `User { googleId @unique, email, name, avatar }` → `jwt.sign(user, JWT_SECRET, 7d)` → redirect `FRONTEND_URL/auth/callback?token=`. Callback reads `?token`, writes `localStorage`, `history.replaceState` to strip token from history, then redirects to dashboard. Subsequent calls attach `Authorization: Bearer <token>` via Axios interceptor; `GET /api/auth/me` verifies and returns the profile for `Header`. Logout clears `localStorage` and redirects to `/api/auth/google`. Trade-off — token in URL + `localStorage` is XSS-reachable and transiently in history; acceptable for 48h assignment, flagged in ADR, mitigated by stripping.
- **Dashboard data**: `Scheduled` table = `findScheduled` (`status=scheduled`, `orderBy scheduledAt asc`), `Sent` table = `findSent` (`status in [sent,failed]`, `orderBy updatedAt desc`), both behind TanStack Query with reusable `EmailTable` (`emails, loading, columns, emptyText`) + toasts.
- **SOLID and patterns as gates (not aspirational)**: Repository (`EmailRepository` interface before `PrismaEmailRepository`), Strategy (`MailProvider`/`EtherealProvider`), Singleton (`getPrisma`/`getRedis` with `maxRetriesPerRequest: null`), DI via `index.ts` composition root. Layering rules are enforced: `api/` never imports `queue/`/`mail/`; `queue/worker.ts` never imports Express; `rateLimiter/` zero Express/BullMQ; `repositories/` only Prisma via `db/prisma-client.ts`. One file one responsibility; no comments, no `console.log`.
- **Schema**: `Email { id String @id, recipient, subject, body @db.Text, sender, scheduledAt, status scheduled|sent|failed @default(scheduled), createdAt, updatedAt }` + `User { id, googleId @unique, email @unique, name?, avatar? }`. After schema edits: `prisma migrate dev` then `prisma generate`.
- **API contracts**: `POST /api/emails/schedule { recipients: email[], subject 1..300, body, sender: email, scheduledAt: datetime, delayBetweenMs?: int>=0 } → 201 { ids: string[], count }`; `GET /api/emails/scheduled?limit&offset → Email[]`; `GET /api/emails/sent → Email[]` (includes `failed`); `GET /api/auth/google`, `GET /api/auth/google/callback → redirect`, `GET /api/auth/me (Bearer)` .
- **Infra**: `docker-compose.yml` Redis 7 `appendonly yes` + Postgres 16; env via `dotenv` in `config/env.ts` with `requireEnv` for `DATABASE_URL` and fallback `dev-secret` for `JWT_SECRET`.

## Testing Decisions

- **What makes a good test**: assert external behavior through the highest seam, not implementation details. Do not assert that a specific Prisma query was called or that a BullMQ internal was invoked directly — assert that the HTTP response, DB status, or queued job state is correct. Fewer seams is better.
- **Seams (proposed, highest possible — confirm before implementing)**:
  - **HTTP API seam** — `scheduleRouter` + `authRouter` via `supertest` against an Express app wired to a fake `EmailRepository` and a temporary Redis/Prisma or test doubles. Existing seam, preferred for all scheduling, auth, and listing stories. No new seam needed.
  - **Worker seam** — `createEmailWorker(repository: EmailRepository, mailProvider: MailProvider)` with injected fakes. Assert idempotency guard (`status=sent → no second send`), rate-limit reschedule (`moveToDelayed`), `sent`/`failed` transitions, and that `MailProvider.send` is swappable. Existing seam via DI, no new abstraction.
  - **RateLimiter seam** — `rateLimiter/hourly-limiter.ts` (`hourWindowKey`, `msUntilNextHour`, `checkAndIncrement`) against a real or `ioredis-mock` Redis. Already isolated (zero Express/BullMQ imports) — the only pure unit-testable module. Existing seam, no new one.
  - **Frontend component seam** — `ComposeModal` CSV parse (PapaParse) with mocked file input (assert dedup, regex, count, zero-guard) and `EmailTable`/`Header` rendering via React Testing Library. No backend needed; no new seam.
  - **E2E/restart seam** — manual demo script (schedule 2-3 emails minutes out, kill backend, restart, assert on-time no-duplicates) + a short rate-limit-under-load clip. Not automated in this build, but the demo is the required proof.
- **Modules to test**: `api/schedule.routes.ts` (validation, bulk create, `addBulk` opts, stagger), `queue/worker.ts` (idempotency, limiter, reschedule, status updates), `rateLimiter/hourly-limiter.ts` (hour window, TTL, threshold), `queue/queue.ts` (delay math, `jobId`, `removeOnComplete`), `mail/ethereal-provider.ts` vs a fake provider via the `MailProvider` Strategy, `auth.routes.ts` (JWT sign/verify), `ComposeModal` (email regex, dedup, disabled state), `Header` (reads `/me`).
- **Prior art**: no existing automated tests in the repo (`backend` has no test script, `frontend` only has `next lint`/`build`, no `.github`/`opencode.json`). New tests will establish the pattern: repository fakes over DB where possible, `ioredis-mock` for limiter, `msw` or `axios-mock` for frontend `lib/api.ts` if needed. The `Definition of Done` gate applies to tests too — no `any`, typed responses.

## Out of Scope

- Reconciliation/re-seed from `status=scheduled` after a full Redis wipe (stranded rows intentionally undefended — ADR 0001 Known limitation).
- Per-request `hourlyLimit` on the schedule API (removed as dead field; limit is global env per-Sender — ADR 0002).
- Per-job `setTimeout` sleep in the Worker (replaced by BullMQ `limiter` — ADR 0003); true strict sequential spacing beyond `limiter: {max:1,duration}` is not added.
- Fire-and-forget 202 + background enqueue for bulk (handler still awaits bulk calls before 201).
- httpOnly-cookie or session-based auth (stays JWT + localStorage + Bearer — ADR 0005); NextAuth switch; MySQL swap; cron/agenda/setInterval; new design patterns beyond Repository/Strategy/Singleton; comments in code.
- Automated E2E for restart/rate-limit demo — covered by the manual 5-minute video per brief §15 (the bonus clip is included, not optional, but stays manual).

## Further Notes

- **Glossary is `CONTEXT.md`** — use `Recipient`, `Authenticated User`, `Sent Emails`, `Batch Stagger`, `Definition of Done` verbatim. Before adding a new term, check that it is domain-specific, not a general programming concept.
- **ADRs**: `docs/adr/0005-auth-token-storage.md` is the only ADR on disk after the "clear everything" reset; Q1–Q4 ADRs (persistence, rate-limit scope, concurrency/delays, bulk enqueue) were locked in the grill but cleared with the code — they will be re-created when those tickets land, alongside the other locked disclosures for the closing README. The README's trade-offs section must cover all five locked disclosures, not a subset.
- **Spec source**: `docs/PROJECT_BRIEF.md` overrides judgment; where this spec and the brief conflict, the brief wins.
- **Build order**: Docker (Redis+Postgres) → Prisma `Email`/`User` → `EmailRepository` + `MailProvider` → Schedule API (validate→`createMany`→`addBulk` with `jobId`) → Worker (rate limiter→idempotency guard→send→status) → limiter isolation → restart test → frontend shell (OAuth+header+tabs) → Compose/Scheduled/Sent wired with loading/empty states → README + demo video. Do not build frontend and backend in parallel.
- **Operational tip**: `getRedis()` must be `new IORedis(url, { maxRetriesPerRequest: null })` for BullMQ; `docker-compose.yml` Redis must run `redis-server --appendonly yes`.
