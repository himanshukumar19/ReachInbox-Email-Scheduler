# AGENTS.md — ReachInbox Email Scheduler

## Stack
TypeScript monorepo (no root package.json / no workspaces): `backend/` = Express + BullMQ + Prisma + Postgres/Redis, `frontend/` = Next.js 14 + Tailwind + TanStack Query. Spec is `docs/PROJECT_BRIEF.md` — it overrides judgment.

## Run — exact order

```bash
docker-compose up -d                          # Redis :6379 (appendonly) + Postgres :5432
cd backend && cp .env.example .env            # fill ETHEREAL_* + GOOGLE_* + JWT_SECRET
npm install
npx prisma migrate dev                        # after any schema.prisma change also run: npm run prisma:generate
npm run dev                                   # ts-node-dev --respawn on src/index.ts — Express + BullMQ worker in one process (:4000)

cd ../frontend && npm install && npm run dev  # Next.js :3000 — requires backend running
```

- `backend`: `npm run build` → `tsc` → `dist/`, `npm start` → `node dist/index.js`. No lint/test scripts. `tsconfig` is `commonjs`/`ES2020`/`strict`/`outDir:dist`/`rootDir:src`.
- `frontend`: `npm run lint` (`next lint`), `npm run build` (`next build`). No tests in repo. No CI / `.github` / `opencode.json` / pre-commit hooks.

## Env (`backend/src/config/env.ts` loads via dotenv)
Required: `DATABASE_URL`, `JWT_SECRET` (falls back to `dev-secret` — change for prod). Optional with defaults: `REDIS_URL=redis://localhost:6379`, `PORT=4000`, `FRONTEND_URL`, `GOOGLE_*`, `ETHEREAL_*`, `MAX_EMAILS_PER_HOUR=50`, `WORKER_CONCURRENCY=5`, `DELAY_BETWEEN_SENDS_MS=1000`. `requireEnv` throws if `DATABASE_URL` missing.

## Entrypoints & DI

- `backend/src/index.ts` is the only composition root — constructs `PrismaEmailRepository` + `EtherealProvider`, wires `scheduleRouter(repository)` and `authRouter()`, calls `createEmailWorker(repo, provider)`. Do not instantiate repos/providers inside routes/worker.
- `backend/src/db/prisma-client.ts` and `backend/src/config/redis.ts` are singletons (`getPrisma()` / `getRedis()`). Redis must be `new IORedis(url, { maxRetriesPerRequest: null })` — BullMQ requirement.
- Queue: `backend/src/queue/queue.ts` — `EMAIL_QUEUE="email-send"`, `enqueueEmail(id, date)` uses `{ delay, jobId: emailId, removeOnComplete:true }` — `jobId` is the idempotency key.
- Worker: `backend/src/queue/worker.ts` — concurrency from `env.workerConcurrency`, idempotency guard `if status==="sent" return` before send, `delayMs` sleep, `updateStatus("sent"|"failed")`, re-throw on fail.
- Routes: `backend/src/api/schedule.routes.ts` (`POST /api/emails/schedule`, `GET /scheduled`, `GET /sent`) + `schedule.schema.ts` (Zod). `api/auth.routes.ts` (Passport Google OAuth20).

## Hard constraints — agents break these

- **No cron.** No `node-cron`/`agenda`/`setInterval` polling. Only BullMQ delayed jobs.
- **Idempotency:** `jobId = emailId` on enqueue + worker checks `findById` status before send. Never remove either.
- **Restart safety:** BullMQ Redis persistence is the source of truth. Never re-seed/enqueue from DB on boot — causes duplicates.
- **Rate limiting:** Redis `INCR`/`EXPIRE` per `rate:${sender}:${yyyy-MM-ddTHH}` (`rateLimiter/hourly-limiter.ts`). Never in-memory. On `count > maxPerHour` → `job.moveToDelayed(msUntilNextHour())`, never drop/fail.
- **1000+ batch:** `schedule.routes.ts` enqueues in loop with staggered `sendAt = base + i*delayBetweenMs` — does not block on sends; worker spreads load.

## Layering rules (enforced in brief §7)

- `api/` never imports `queue/` or `mail/` directly.
- `queue/worker.ts` never imports Express types.
- `rateLimiter/` has zero Express/BullMQ imports — unit-testable alone.
- `repositories/` is the only layer importing Prisma, via `db/prisma-client.ts` shared instance. Define interface in `email.repository.ts` before implementation.

## Conventions (brief §9 — review will fail without these)

- **No comments in code, no `console.log` left behind.** Extract a well-named function instead of commenting.
- Naming: `camelCase` vars/fns, `PascalCase` types/interfaces/components, `kebab-case` files (React components `PascalCase.tsx`).
- **No `any`** — every API response and React prop is typed (`frontend/src/types/email.ts`, `lib/api.ts`).
- One file, one responsibility; interfaces before implementations; SOLID patterns exactly: Repository (`repositories/`), Strategy (`mail/mail-provider.ts`), Singleton (`config/redis.ts`, `db/prisma-client.ts`) + DI.

## Prisma

- `backend/prisma/schema.prisma` — `Email { scheduled, sent, failed }` + `User { googleId @unique }`, Postgres. After edits: `npx prisma migrate dev` then `npx prisma generate`.
- Repo interface: `create / findById / findScheduled / findSent / updateStatus` — keep small (ISP).

## Frontend notes

- `frontend/src/app/` (App Router), `components/` (`EmailTable`, `ComposeModal`, `Header`), `lib/api.ts` (typed axios client), `types/email.ts`.
- CSV upload uses `papaparse` — skip malformed rows, show valid count. Dashboard needs `Scheduled`/`Sent` tabs, `Compose` modal (subject/body/CSV/startTime/delay/hourlyLimit), header with avatar/name, toasts via `sonner`.
