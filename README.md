# ReachInbox Email Scheduler

Production-grade email scheduler + dashboard built for the ReachInbox.ai SDE Intern assignment.

## Quick Start

```bash
# 1. Infra — Redis appendonly + Postgres
docker-compose up -d

# 2. Backend
cd backend
cp .env.example .env          # fill ETHEREAL_* + GOOGLE_* + JWT_SECRET
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
- All sends are captured at Ethereal (not a real inbox); this is the fake SMTP required by the brief.
- **Preview URL:** after each send the backend prints `Ethereal preview: <url>` to stdout. Open that URL (log in with your Ethereal credentials) to view the captured message. This is the only way to read sent mail — Ethereal has no inbox polling.

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
| `MAX_EMAILS_PER_HOUR` | `50` | Global per-sender hourly cap (env fallback) |
| `WORKER_CONCURRENCY` | `5` | BullMQ worker slots |
| `DELAY_BETWEEN_SENDS_MS` | `1000` | Minimum gap between sends |

## Architecture

```
Next.js (Tailwind) → Express API (Zod) → Postgres (source of truth)
                              └→ BullMQ delayed jobs (Redis) → Worker → Ethereal SMTP
                                                      └→ Redis hourly rate-limiter (per Sender + per-request cap)
```

- **Scheduling:** API writes the `Email` DB row, then enqueues a BullMQ delayed job with `jobId = emailId` (`crypto.randomUUID()`). Never uses `cron` or `setInterval`.
- **Restart persistence:** BullMQ Redis persistence is the sole recovery mechanism. `index.ts` creates the worker but never queries `status=scheduled` to re-enqueue. No boot-time DB re-seed.
- **Rate limiting:** Redis `INCR` + `EXPIRE 3600` per `rate:<sender>:<yyyy-MM-ddTHH>`. The cap used is whichever is lower — the per-request `hourlyLimit` sent by the Compose UI, or the global `MAX_EMAILS_PER_HOUR` env fallback when no per-request value is supplied. On breach, `job.moveToDelayed(msUntilNextHour())` — never drops or fails. `rateLimiter/` has zero Express/BullMQ imports (unit-testable standalone).
- **Concurrency decoupling:** `WORKER_CONCURRENCY` governs mid-flight I/O parallelism; `limiter: { max: 1, duration: env.delayMs }` enforces true gap across concurrent slots (replaces per-job `setTimeout`).
- **Preview URL:** `EtherealProvider.send()` calls `process.stdout.write()` with the Ethereal preview URL after each send. The log lives inside the Strategy implementation — `worker.ts` and `MailProvider` interface have no knowledge of Ethereal or nodemailer.

## Feature Checklist (maps to brief §8–9)

### Backend
- [x] Accept scheduling via `POST /api/emails/schedule` (bulk 1000+ recipients, non-blocking 201)
- [x] BullMQ delayed jobs (`delay` per recipient, `Batch Stagger`) — no cron
- [x] Send from multiple senders via Ethereal SMTP (`MailProvider` strategy)
- [x] Survive restarts — no duplicate or lost sends (BullMQ Redis persistence, `jobId` dedup)
- [x] Configurable worker concurrency (`WORKER_CONCURRENCY=5`) + safe under parallel jobs
- [x] Minimum delay between sends (`DELAY_BETWEEN_SENDS_MS=1000`) via BullMQ limiter
- [x] Configurable hourly rate limit — per-request `hourlyLimit` field overrides global `MAX_EMAILS_PER_HOUR`; Redis/DB-backed, never in-memory
- [x] On limit hit: reschedule into next hour (`moveToDelayed`), never drop/fail
- [x] Bulk enqueue uses `createMany` + `addBulk`; 1000 recipients returns 201 without blocking

### Frontend
- [x] Real Google OAuth (`/api/auth/google` → `/auth/callback`) — redirect to dashboard
- [x] Header shows name, email, avatar; logout works
- [x] Dashboard: header + `Scheduled` / `Sent` tabs + Compose button
- [x] Compose flow: subject, body, CSV/text upload, start time, delay between sends, hourly limit, Schedule action
- [x] CSV parsing defensive (skip malformed rows, show valid count + skipped count); block submit if count is 0
- [x] `Scheduled` table: email, subject, scheduled time, status + skeleton loading rows + empty state
- [x] `Sent` table: email, subject, sent time, status (`sent` or `failed`) + skeleton loading rows + empty state
- [x] Reusable components (`EmailTable`, `ComposeModal`, `Header`, `StatusBadge`, `LoginPage`), DRY, typed props and API responses
- [x] Compose validation: empty subject/body, 0 valid recipients, past start date — all blocked inline before any API call fires
- [x] Error handling via `sonner` toasts (schedule failure, CSV all-bad, network error)

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/emails/schedule` | Create and enqueue a batch |
| `GET` | `/api/emails/scheduled` | Emails with `status=scheduled` |
| `GET` | `/api/emails/sent` | Emails with `status∈{sent,failed}` |
| `GET` | `/api/auth/google` | Start Google OAuth flow |
| `GET` | `/api/auth/google/callback` | OAuth callback → JWT redirect |
| `GET` | `/api/me` | Current authenticated user |
| `GET` | `/health` | Health probe → `{"ok":true}` |

### `POST /api/emails/schedule` payload

```json
{
  "recipients": ["a@example.com", "b@example.com"],
  "subject": "Hello",
  "body": "<p>Body HTML</p>",
  "sender": "you@example.com",
  "scheduledAt": "2026-09-25T10:00:00.000Z",
  "delayBetweenMs": 1000,
  "hourlyLimit": 10
}
```

`hourlyLimit` is optional. When omitted, the worker falls back to `MAX_EMAILS_PER_HOUR` (env). When provided, it overrides the env cap for every job in this batch — stored in BullMQ Redis job data and read by the worker at send time.

## Sent Emails Note

`Sent` tab = `status ∈ {sent, failed}` as returned by `GET /api/emails/sent`. The tab labeled `Sent` shows both outcomes — the displayed "sent time" for a `failed` row is `updatedAt` (time of the failed attempt, not an actual delivery). This is intentional and matches the brief's design.

## Demo Script

1. Schedule 2–3 emails 2–3 minutes out via Compose or `curl POST /api/emails/schedule`.
2. Note the returned email IDs (UUID — same as DB PK and BullMQ `jobId`).
3. Kill the backend (`kill <pid>` or Ctrl-C).
4. Restart (`npm run dev` inside `backend/`).
5. Confirm on-time sends with zero duplicates — check DB (`scheduled` → `sent`) and Ethereal preview URLs in stdout.
6. Rate-limit clip: set `hourlyLimit=3` in Compose, schedule 5 emails; verify emails 4–5 move to delayed (DB stays `scheduled`, BullMQ delayed queue has 2 entries). Alternatively, let `MAX_EMAILS_PER_HOUR=50` kick in via env fallback by omitting the field.
7. Open dashboard `Scheduled` / `Sent` tabs (`http://localhost:3000`) to surface both states.

## Disclosures — Trade-offs

### 1. JWT in `localStorage` + URL parameter
Passport GoogleStrategy produces a JWT; it is passed in the redirect URL (`?token=`) and stored in `localStorage`. This is XSS-reachable and transiently visible in browser history/server logs. Short 7-day expiry, URL stripped immediately (`history.replaceState`), and no server-side session are the mitigations for the 48h scope. Not production-appropriate.

### 2. UUID over autoincrement for bulk idempotency
`Email` rows use `crypto.randomUUID()` (client-side) as both Prisma PK and BullMQ `jobId`. This avoids autoincrement collisions on bulk enqueue (`createMany` + `addBulk`) and gives idempotency via BullMQ key deduplication. DB rows never have sequential IDs.

### 3. Redis wipe strands `scheduled` DB rows
If Redis is fully wiped (not just restarted), all delayed `email-send` jobs are lost. DB rows with `status=scheduled` become stranded and will never send. This is an accepted trade-off: a naive boot-time DB re-seed risks duplicate sends if the job survived in Redis, so BullMQ persistence is the sole recovery mechanism. Stranded rows can be manually re-enqueued by their UUID.

### 4. Per-request `hourlyLimit` overrides env cap
`POST /api/emails/schedule` accepts an optional `hourlyLimit` integer. When provided, each enqueued job carries this value in its BullMQ Redis payload and the worker passes it directly to `checkAndIncrement(sender, hourlyLimit)`. When absent, `hourlyLimit` is `undefined` in the worker, triggering the JS default parameter `maxPerHour = env.maxPerHour`. The two paths are mutually exclusive per batch — there is no merging or min/max between them.

### 5. Limiter vs concurrency decoupled
`WORKER_CONCURRENCY` governs I/O parallelism; `limiter: { max: 1, duration: env.delayMs }` enforces true gap across concurrent worker slots. No per-job `setTimeout` sleep. The BullMQ limiter operates at the worker level, so 5 concurrent slots still send at most one email per `delayMs` — true pacing, not simulated.

## Process Lock (Definition of Done)

Every change is gated on: SOLID principles (§5), exactly three patterns (`repositories/` interface + Prisma, `mail/` strategy + Ethereal, singletons for Redis/DB), dependency injection at `index.ts`, four layer rules (`api` never imports `queue`/`mail`; `queue/` never imports Express; `rateLimiter/` has zero Express/BullMQ imports; `repositories/` is the only Prisma importer), and no `any`, no comments, no leftover `console.log`, naming conventions (`camelCase` vars, `PascalCase` types/components, `kebab-case` files except `PascalCase.tsx`). Any new boundary exception requires an ADR (`docs/adr/`) before code — never ad-hoc.

## Docs

- `docs/PROJECT_BRIEF.md` — single source of truth (assignment brief, unchanged from original)
- `docs/ReachInbox Email Scheduler - Assignment Reference Guide.pdf` — assignment brief PDF (read-only reference)
- `docs/adr/0001-persistence-and-idempotency.md` — restart + idempotency decisions + known limitation
- `docs/adr/0002-rate-limit-scope.md` — per-sender hourly cap scope
- `docs/adr/0005-auth-token-storage.md` — JWT in URL + `localStorage`
- `CONTEXT.md` — domain vocabulary (`Sent Emails`, `Batch Stagger`, `Scheduled Email`, etc.)
