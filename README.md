# ReachInbox Email Scheduler

Production-grade email scheduler + dashboard built for the ReachInbox.ai SDE Intern assignment.

## Quick Start

```bash
# 1. Infra
docker-compose up -d          # Redis + Postgres
# 2. Backend
cd backend
cp .env.example .env          # fill GOOGLE + ETHEREAL creds
npm install
npx prisma migrate dev
npm run dev                   # Express + BullMQ worker in one process
# 3. Frontend
cd ../frontend
npm install
npm run dev                   # Next.js on http://localhost:3000
```

## Architecture

```
Next.js (Tailwind) → Express API (Zod) → Postgres (source of truth)
                                └→ BullMQ delayed jobs (Redis) → Worker → Ethereal SMTP
                                                        └→ Redis hourly rate-limiter
```

- API writes DB then enqueues a delayed job with `jobId = emailId` (idempotency key).
- Worker checks hourly limit (Redis INCR/EXPIRE per sender+hour), then DB status, then sends via `MailProvider` strategy.
- On limit hit: `job.moveToDelayed(nextHour)` — never drops.
- Restart safety: BullMQ Redis persistence is primary; no naive DB re-seed on boot.

## Env (`backend/.env.example`)

```
DATABASE_URL=postgresql://reachinbox:reachinbox@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
ETHEREAL_HOST=smtp.ethereal.email
ETHEREAL_PORT=587
ETHEREAL_USER=
ETHEREAL_PASS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
JWT_SECRET=change-me
MAX_EMAILS_PER_HOUR=50
WORKER_CONCURRENCY=5
DELAY_BETWEEN_SENDS_MS=1000
```

## Features

See `docs/PROJECT_BRIEF.md` for the full spec. Feature checklist maps 1:1 to sections 8–9 of the brief.

## Docs

- `docs/PROJECT_BRIEF.md` — single source of truth (copied from assignment)
- `docs/Assignment_Brief.pdf` — same brief in PDF form
