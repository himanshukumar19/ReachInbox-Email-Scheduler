# ReachInbox Email Scheduler — Project Brief

This file is the single source of truth for this build. Follow it exactly. Where this file and your own judgment disagree, this file wins — ask before deviating from any hard constraint.

---

## 1. Objective

Build a production-grade email scheduler service with a dashboard: a backend that accepts email-send requests via API, schedules them using BullMQ + Redis (never cron), sends them through Ethereal Email (fake SMTP), and survives server restarts without duplicate or lost sends. A frontend dashboard lets a user schedule emails and see what's scheduled vs. sent.

Deadline: 48 hours. Code will be reviewed for originality and code quality, not just functional correctness.

---

## 2. Hard Constraints — Non-Negotiable

- **No cron, in any form.** No OS crontab, no `node-cron`, no `agenda`, no setInterval-based polling loops standing in for scheduling. Scheduling only via BullMQ delayed jobs or a custom Redis/DB scheduler.
- **Idempotency is required, not optional.** The same email must never be sent twice, even if a job re-runs after a crash mid-send.
- **Persistence across restarts.** Future scheduled emails must still send on time after a server restart, with no duplication and no loss. On restart, rely on BullMQ's own Redis persistence to recover pending jobs first. Do not re-seed jobs from the database on startup unless you have a guard that makes it impossible to double-enqueue the same email — a naive DB re-seed on every boot is the single most common way this constraint gets silently violated.
- **Rate limiting must be Redis/DB-backed, never in-memory only.** In-memory counters break the moment there is more than one worker process.
- **On hourly rate limit hit, reschedule into the next hour window. Never drop or permanently fail the job.**

---

## 3. Tech Stack

### Backend
- TypeScript
- Express.js
- BullMQ (Redis-backed) — persistent job queue for delayed jobs
- PostgreSQL — durable source of truth, independent of what's in the queue. (The assignment allows MySQL or Postgres; Postgres is the choice here for stronger transactional guarantees around the rate-limit counters and idempotency checks. Swapping to MySQL does not violate the assignment — only change this if explicitly told to.)
- Prisma — typed DB access and migrations
- Zod — request validation
- Passport.js (Google OAuth20 strategy) or NextAuth.js if the frontend is Next.js
- Nodemailer + Ethereal Email — fake SMTP send flow

### Frontend
- Next.js. (The assignment allows plain React.js or Next.js — Next.js is the choice here for built-in routing across the dashboard/compose views. Do not switch to plain React unless explicitly told to.)
- Tailwind CSS
- TypeScript
- TanStack Query (React Query) for data fetching, loading/empty states, caching
- PapaParse for CSV lead upload parsing
- react-hot-toast or sonner for error/success toasts

### Infra
- Docker Compose — Redis + Postgres, one command to spin up both. (The assignment marks Docker as recommended, not mandatory — it is treated as required in this build for a consistent, reproducible local setup.)
- dotenv — config via `.env.example`

---

## 4. Architecture

Request flow:

```
Frontend dashboard (Next.js, Tailwind, Google OAuth)
        │
        ▼
Backend API (Express, Zod validation, TS)
        │
        ├──────────────► Database (Postgres, source of truth)
        │
        └──────────────► Job queue (BullMQ + Redis, delayed jobs)
                                   │
                                   ▼
                                Worker (sends via Ethereal, idempotent)
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                Rate limiter            Ethereal SMTP
                (hourly caps,           (fake mail
                 Redis counters)         provider, dev)
```

Notes on the flow:
- The API writes to the database and enqueues a BullMQ job in the same request — it does not wait for the job to run.
- The worker is the only thing that sends mail. Before sending, it checks the DB row's status via the repository. Before that, it checks the rate limiter. If the limiter says the hourly cap is hit, the worker reschedules the job into the next hour window instead of sending or failing.
- After a successful send, the worker updates the DB row to `sent`. On failure, it updates to `failed` (never leaves it silently `pending` after an attempted send).

---

## 5. SOLID Principles — Apply Concretely, Not Just in Spirit

- **Single Responsibility:** Every file does one thing. `api/` orchestrates only — no business logic inline. `queue/worker.ts` only handles job lifecycle. `rateLimiter/` only handles rate-limit logic. Route handlers never talk to Redis or Prisma directly — they call a repository or service.
- **Open/Closed:** Code should be extendable without modification. Adding a new mail provider (e.g. SendGrid later) should mean adding a new file, not editing `worker.ts`.
- **Liskov Substitution:** Any `MailProvider` implementation (Ethereal, SendGrid, SES) must be swappable for another without breaking the worker that consumes it.
- **Interface Segregation:** Keep interfaces small and focused. `EmailRepository` exposes only what's needed — `findById`, `create`, `updateStatus` — not a full Prisma client surface.
- **Dependency Inversion:** High-level modules (worker, routes) depend on interfaces (`EmailRepository`, `MailProvider`), not concrete implementations (`PrismaEmailRepository`, `EtherealProvider`). Inject concrete implementations at the composition root (`index.ts`), not inside the modules that use them.

---

## 6. Design Patterns to Use

Use exactly these three unless there is a clear, stated reason to add more. Do not over-engineer this — it is a 48-hour assignment, not a framework.

1. **Repository Pattern** — `repositories/email.repository.ts` (interface) + `repositories/prisma-email.repository.ts` (implementation). Decouples business logic from Prisma/SQL.
2. **Strategy Pattern** — `mail/mail-provider.ts` (interface) + `mail/ethereal-provider.ts` (implementation). Lets the mail-sending mechanism be swapped without touching the worker.
3. **Singleton Pattern** — one Redis connection instance (`config/redis.ts`), one Prisma client instance. Reused across the whole app rather than reconnecting.

Dependency Injection is the mechanism that ties these together: pass repository/provider instances into the worker and routes rather than importing concrete classes inside them.

---

## 7. Folder Structure

```
reachinbox-scheduler/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   ├── schedule.routes.ts       # controller — orchestrates only
│   │   │   ├── schedule.schema.ts       # Zod validation schemas
│   │   │   └── auth.routes.ts           # Google OAuth endpoints
│   │   ├── repositories/
│   │   │   ├── email.repository.ts      # interface
│   │   │   └── prisma-email.repository.ts
│   │   ├── queue/
│   │   │   ├── queue.ts                 # BullMQ queue instance
│   │   │   └── worker.ts                # job consumer, idempotency guard
│   │   ├── mail/
│   │   │   ├── mail-provider.ts         # interface
│   │   │   └── ethereal-provider.ts
│   │   ├── rateLimiter/
│   │   │   └── hourly-limiter.ts        # Redis-backed counters, isolated
│   │   ├── db/
│   │   │   └── prisma-client.ts         # Prisma client instance (Singleton)
│   │   ├── config/
│   │   │   ├── redis.ts                 # Redis client (Singleton)
│   │   │   └── env.ts                   # typed env loader
│   │   └── index.ts                     # Express entry — composition root
│   ├── prisma/
│   │   └── schema.prisma
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/ (or pages/)
│   │   │   ├── dashboard/
│   │   │   └── auth/callback/
│   │   ├── components/
│   │   │   ├── EmailTable.tsx           # reusable, takes columns prop
│   │   │   ├── ComposeModal.tsx
│   │   │   └── Header.tsx
│   │   ├── lib/
│   │   │   └── api.ts                   # typed API client
│   │   └── types/
│   │       └── email.ts                 # shared response types
│   └── package.json
├── docker-compose.yml                   # Redis + Postgres
└── README.md
```

Rules that keep this clean:
- `api/` never imports from `queue/` or `mail/` directly.
- `queue/worker.ts` never imports Express types.
- `rateLimiter/` has zero Express or BullMQ imports — it must be unit-testable standalone.
- `repositories/` is the only layer that imports Prisma directly, and it imports the shared instance from `db/prisma-client.ts` rather than instantiating its own `PrismaClient`.

---

## 8. Features Checklist

### Backend
- [ ] Accept scheduling requests via API, store in relational DB
- [ ] Schedule sends using BullMQ delayed jobs (never cron)
- [ ] Send from multiple senders via Ethereal Email
- [ ] Survive restarts — no duplicate or lost sends
- [ ] Configurable worker concurrency, safe under parallel jobs
- [ ] Minimum delay between individual sends (documented in README)
- [ ] Configurable hourly rate limit (global or per-sender), Redis/DB-backed
- [ ] On limit hit, reschedule into next hour window — never drop
- [ ] Defined behavior for 1000+ emails scheduled at the same time (API doesn't block on enqueue)

### Frontend
- [ ] Real Google OAuth login (not mocked), redirect to dashboard after login
- [ ] Header shows name, email, avatar; logout works
- [ ] Dashboard: header + Scheduled/Sent tabs + Compose New Email button, matching Figma
- [ ] Compose flow: subject, body, CSV/text lead upload with detected address count, start time, delay, hourly limit, Schedule action
- [ ] CSV parsing is defensive — malformed or invalid rows are skipped rather than crashing the upload, and the UI shows how many valid addresses were actually found
- [ ] Scheduled Emails table: email, subject, scheduled time, status, loading/empty states
- [ ] Sent Emails table: email, subject, sent time, status (sent/failed), loading/empty states
- [ ] Reusable components (buttons, inputs, tables, modals), DRY, typed API responses and props
- [ ] Basic error handling via messages/toasts

---

## 9. Coding Standards

- **No comments in code.** Code must be self-explanatory through naming and structure. If a piece of logic needs a comment to be understood, refactor it — extract a well-named function instead.
- **Naming conventions:** `camelCase` for variables/functions, `PascalCase` for types/interfaces/React components, `kebab-case` for file names (except React components, which use `PascalCase.tsx`).
- **No console.logs left in final code.**
- **Every API response and React prop is typed.** No `any`.
- **One file, one responsibility.** If a file is doing two unrelated things, split it.
- **Interfaces before implementations.** When adding a new module that other modules will depend on (repository, provider), define the interface/type first.

---

## 10. Build Order

Follow this sequence. Do not build frontend and backend in parallel — the frontend depends on a working API.

1. Docker Compose for Redis + Postgres. Confirm BullMQ can connect.
2. Prisma schema: `Email` model (recipient, subject, body, sender, scheduledAt, status, createdAt).
3. `EmailRepository` interface + Prisma implementation.
4. `MailProvider` interface + Ethereal implementation.
5. Schedule API route: validate (Zod) → write DB row via repository → enqueue BullMQ delayed job using the DB row's id as `jobId`.
6. Worker: pick up job → check rate limiter → check DB status (idempotency guard) → send via mail provider → update status.
7. Hourly rate limiter: Redis `INCR` + `EXPIRE` per sender-hour key; on limit hit, `moveToDelayed` into next hour.
8. Test the restart scenario explicitly: schedule a few emails minutes out, kill the server, restart, confirm correct behavior with no duplicates.
9. Frontend shell: Google OAuth, header, dashboard tabs.
10. Compose, Scheduled, and Sent views wired to the backend API, matching Figma, with loading/empty states.
11. README + demo video (max 5 minutes): scheduling, dashboard, restart scenario, and — if time allows — rate limiting under load.

---

## 11. API Endpoints (adjust names if needed, but document whatever is built)

- `POST /api/emails/schedule` — create and enqueue a batch of scheduled emails
- `GET /api/emails/scheduled` — list emails not yet sent
- `GET /api/emails/sent` — list emails with status sent or failed
- `GET /api/auth/google` and `GET /api/auth/callback` — OAuth flow

---

## 12. Example Reference Snippets

Enqueuing a delayed job (idempotency via `jobId`):

```ts
await emailQueue.add(
  "send-email",
  { emailId },
  { delay: sendAt.getTime() - Date.now(), jobId: emailId }
);
```

Redis-backed hourly counter:

```ts
const key = `rate:${sender}:${hourWindow}`;
const count = await redis.incr(key);
if (count === 1) await redis.expire(key, 3600);
if (count > MAX_EMAILS_PER_HOUR) {
  await job.moveToDelayed(Date.now() + msUntilNextHour);
  return;
}
```

Idempotent send:

```ts
const email = await emailRepository.findById(emailId);
if (email.status === "sent") return;
await mailProvider.send(email);
await emailRepository.updateStatus(emailId, "sent");
```

---

## 13. Error Handling & Edge Cases

- **1000+ emails scheduled at once:** the schedule API must enqueue without blocking the response — do not `await` all sends synchronously in the request handler. Let the worker spread the actual sending out over time.
- **Hourly limit reached:** reschedule into the next hour window. Never drop or permanently fail the job.
- **Server restart mid-queue:** rely on BullMQ's own Redis persistence first. Do not re-seed jobs from the database in a way that could create duplicate enqueues — this is the most likely source of an accidental double-send.
- **Bad rows in a CSV upload:** parse defensively and show the user how many valid addresses were actually found, rather than failing the whole upload on one bad row.

---

## 14. What Evaluators Are Looking At

- Correct BullMQ + Redis wiring, with genuinely no cron anywhere
- Rate limiting and concurrency that stay correct across multiple worker processes, not just in memory
- Clean restart behavior — demoed on video, must actually work
- Frontend fidelity to the Figma
- Code quality: folder structure, reusable components, typed API, SOLID adherence, no dead code, no comments

---

## 15. Submission Checklist

1. Private GitHub repository (monorepo or split backend/frontend folders) — grant access to reviewers named in the assignment email
2. README.md covering: run instructions (backend, Redis, DB, worker, frontend), Ethereal setup and env variables, architecture overview, feature checklist mapped to requirements
3. Demo video (max 5 minutes): scheduling emails, dashboard with Scheduled/Sent tabs, restart scenario (stop → start → confirm future emails still send correctly)
4. A note on assumptions, shortcuts, or trade-offs made anywhere in the build
