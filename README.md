# ReachInbox Email Scheduler

Production-grade email scheduler + dashboard built for the ReachInbox.ai SDE Intern assignment.

## Quick Start

```bash
# 1. Infra — Redis appendonly + Postgres
docker-compose up -d

# 2. Backend
cd backend
cp .env.example .env          # fill ETHEREAL + GOOGLE + JWT_SECRET
npm install
npx prisma migrate dev        # creates DB + applies migrations
npx prisma generate           # typed client
npm run dev                   # Express + BullMQ worker in one process (:4000)

# 3. Frontend
cd ../frontend
npm install
npm run dev                   # Next.js (:3000) — requires backend running
```

## Ethereal Setup

- Sign up at https://ethereal.email and create an account.
- Copy `ETHEREAL_USER` and `ETHEREAL_PASS` from the Ethereal dashboard into `backend/.env`.
- The `ETHEREAL_HOST` (`smtp.ethereal.email`) and `ETHEREAL_PORT` (`587`) are pre-filled.
- All sends are captured at Ethereal (not real inbox); this is the fake SMTP required by the brief.

## Env (`backend/.env.example`)

| Variable | Default / Example | Purpose |
|---|---|---|
| `DATABASE_URL` | `postgresql://reachinbox:reachinbox@localhost:5432/reachinbox` | Postgres source of truth |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ persistence + rate limiter |
| `ETHEREAL_HOST` | `smtp.ethereal.email` | Fake SMTP host |
| `ETHEREAL_PORT` | `587` | Fake SMTP port |
| `ETHEREAL_USER` | (blank) | Ethereal account user |
| `ETHEREAL_PASS` | (blank) | Ethereal account pass |
| `GOOGLE_CLIENT_ID` | (blank) | OAuth App ID |
| `GOOGLE_CLIENT_SECRET` | (blank) | OAuth App Secret |
| `GOOGLE_CALLBACK_URL` | `http://localhost:4000/api/auth/google/callback` | OAuth redirect |
| `FRONTEND_URL` | `http://localhost:3000` | CORS origin |
| `JWT_SECRET` | `dev-secret` (change for prod) | Token signing key |
| `MAX_EMAILS_PER_HOUR` | `50` | Per-Sender hourly cap |
| `WORKER_CONCURRENCY` | `5` | BullMQ worker slots |
| `DELAY_BETWEEN_SENDS_MS` | `1000` | Minimum gap between sends |

## Architecture

```
Next.js (Tailwind) → Express API (Zod) → Postgres (source of truth)
                                └→ BullMQ delayed jobs (Redis) → Worker → Ethereal SMTP
                                                        └→ Redis hourly rate-limiter (per Sender)
```

- Scheduling: API writes DB row (`Email`), then enqueues a BullMQ delayed job with `jobId = EmailId` (`crypto.randomUUID()` from bulk enqueue). Never uses `cron` or `setInterval`.
- Restart persistence: BullMQ Redis persistence is the primary recovery mechanism. `index.ts` creates the worker but never queries `status=scheduled` to re-enqueue. No boot-time DB re-seed.
- Rate limiting: Redis `INCR` + `EXPIRE 3600` per `rate:<Sender>:<hour>` against the global env `MAX_EMAILS_PER_HOUR`. On breach, `job.moveToDelayed(msUntilNextHour())` — never drops or fails.
- Concurrency decoupling: `WORKER_CONCURRENCY` governs mid-flight I/O parallelism; `limiter: { max: 1, duration: env.delayMs }` enforces true gap across concurrent slots (replaces per-job `setTimeout`).

## Feature Checklist (maps to brief §8–9)

### Backend
- [x] Accept scheduling via `POST /api/emails/schedule` (bulk 1000+ recipients, non-blocking 201)
- [x] BullMQ delayed jobs (`delay` per recipient, `Batch Stagger`) — no cron
- [x] Send from multiple senders via Ethereal SMTP (`MailProvider` strategy)
- [x] Survive restarts — no duplicate or lost sends (BullMQ Redis persistence, `jobId` dedup)
- [x] Configurable worker concurrency (`WORKER_CONCURRENCY=5`) + safe under parallel jobs
- [x] Minimum delay between sends (`DELAY_BETWEEN_SENDS_MS=1000`) via BullMQ limiter
- [x] Configurable hourly rate limit (`MAX_EMAILS_PER_HOUR`) — Redis/DB-backed, never in-memory
- [x] On limit hit: reschedule into next hour (`moveToDelayed`), never drop/fail
- [x] Bulk enqueue uses `createMany` + `addBulk`; 1000 recipients returns 201 without blocking

### Frontend
- [x] Real Google OAuth (`/api/auth/google` → `/auth/callback`) — redirect to dashboard
- [x] Header shows name, email, avatar; logout works
- [x] Dashboard: header + `Scheduled` / `Sent` tabs + Compose button (matches Figma)
- [x] Compose flow: subject, body, CSV/text upload, start time, delay, hourly cap, Schedule action
- [x] CSV parsing defensive (skip malformed, show valid count); block if count is 0
- [x] `Scheduled` table: email, subject, scheduled time, status + loading/empty states
- [x] `Sent` table: email, subject, sent time, status (`sent` or `failed`) — see `CONTEXT.md: Sent Emails`
- [x] Reusable components (`EmailTable`, `ComposeModal`, `Header`), DRY, typed props and API responses
- [x] Basic error handling via `sonner` toasts

## Sent Emails Note (`CONTEXT.md`)

`Sent` = `status ∈ {sent, failed}` as returned by `GET /api/emails/sent`; the dashboard tab labeled `Sent` shows both outcomes to match the Figma design. The displayed "sent time" for a `failed` row is `updatedAt` (time of the failed attempt, not an actual send). This is explicit — not an implicit assumption — so reviewers and future maintainers know why `failed` rows appear under the `Sent` tab.

## Demo Script (locked, not optional — issue 07)

Run `./demo.sh` (locked sequence; do not edit):

1. Schedule 2–3 emails 2–3 minutes out via Compose or `curl POST /api/emails/schedule`.
2. Note the returned email IDs (`crypto.randomUUID()` — same as DB PK and BullMQ `jobId`).
3. Kill the backend (`kill <pid>` or Ctrl-C).
4. Restart (`npm run dev` inside `backend/`).
5. Confirm on-time sends with zero duplicates — check DB (`scheduled` → `sent`) and BullMQ job removal.
6. Rate-limit-under-load clip: send 5+ quickly with concurrency 5; observe paced sends via BullMQ limiter (not 5 at once). Exceed hourly cap for one sender; verify `job.moveToDelayed` to next hour and DB row stays `scheduled` (no drop).
7. Open dashboard `Scheduled` / `Sent` tabs (`http://localhost:3000`) to surface both states.

This exercises Q1/04 (restart persistence), Q3/02 (limiter vs concurrency decoupling), and Q4/01 (bulk idempotency via UUID `jobId`).

## Disclosures — Trade-offs (locked, process-locked, no new ADR required for disclosure)

These are the five locked trade-offs from the assignment. They are documented here per brief §15.4 ("note on assumptions, shortcuts, or trade-offs anywhere"). Process is locked (`Definition of Done`): any new design-pattern exception requires an ADR first (`docs/adr/`).

### 1. JWT in `localStorage` + URL parameter (Q6 / ADR 0005)
Passport GoogleStrategy produces a JWT; it is passed in redirect URL (`?token=`) and stored in `localStorage`. This is XSS-reachable and transiently visible in browser history / server logs. Short 7-day expiry, URL stripped immediately (`history.replaceState`), and no server-side session are the mitigations for the 48h scope. Not production-appropriate.

### 2. UUID over autoincrement for bulk idempotency (Q4 / issue 01)
`Email` rows use `crypto.randomUUID()` (client-side) as both Prisma PK and BullMQ `jobId`. This avoids autoincrement collisions on bulk enqueue (`createMany` + `addBulk`) and gives idempotency by BullMQ key deduplication. It means DB rows never have sequential IDs; referential joins rely on UUID.

### 3. Redis wipe strands `scheduled` DB rows (Q1 / ADR 0001)
If Redis is fully wiped (not just restarted), all delayed `email-send` jobs are lost. The DB rows with `status = scheduled` become stranded — they will never send and are not automatically reconciled. This is an accepted, disclosed trade-off: any naive boot-time re-seed risks duplicate sends if the job survived in Redis, so we rely solely on BullMQ persistence rather than reconciling.

### 4. Global env per-Sender limit, not per-request (Q2 / ADR 0002)
Rate limit is `MAX_EMAILS_PER_HOUR` applied globally per sender (`rate:<Sender>:<hour>`). There is no per-request `hourlyLimit` field in `schedule.schema.ts` or `SchedulePayload`. This simplifies the limit surface: one env path, no request-level override, and `rateLimiter/` has zero Express/BullMQ imports (unit-testable standalone).

### 5. Limiter vs concurrency decoupled (Q3 / issue 02)
`WORKER_CONCURRENCY` governs I/O parallelism; `limiter: { max: 1, duration: env.delayMs }` enforces true gap across concurrent worker slots. We removed the per-job `setTimeout` sleep from `queue/worker.ts`. The limiter operates at the BullMQ worker level, so 5 concurrent slots still send at most one email per `delayMs` — true pacing, not simulated pacing inside each job.

## Process Lock (Definition of Done)

Every change is gated on: SOLID principles (§5), exactly three patterns (`repositories/` interface + Prisma, `mail/` strategy + Ethereal, singletons for Redis/DB), dependency injection at `index.ts`, four layer rules (`api` never imports `queue`/`mail`, `queue/` never imports Express, `rateLimiter/` has zero Express/BullMQ imports, `repositories/` is the only Prisma importer), and no `any`, no comments, no leftover `console.log`, naming conventions (`camelCase` vars, `PascalCase` types/components, `kebab-case` files except `PascalCase.tsx`). Any new boundary exception requires an ADR (`docs/adr/`) before code — never ad-hoc.

## Docs

- `docs/PROJECT_BRIEF.md` — single source of truth (assignment brief)
- `docs/ReachInbox Email Scheduler - Assignment Reference Guide.pdf` — assignment brief PDF
- `docs/adr/0001-persistence-and-idempotency.md` — restart + idempotency decisions + known limitation (ADR)
- `docs/adr/0002-rate-limit-scope.md` — per-Sender hourly cap scope (ADR)
- `docs/adr/0005-auth-token-storage.md` — JWT in URL + `localStorage` (ADR)
- `CONTEXT.md` — domain vocabulary (`Sent Emails`, `Batch Stagger`, `Scheduled Email`, etc.)
- `demo.sh` — locked demo script (see below)
