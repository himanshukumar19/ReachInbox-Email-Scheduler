# 07 — Closing: README + demo script + trade-offs

**What to build:** `README.md` as the submission's single docs gate, plus the locked demo script that proves the hard constraints and the engineering behind Q3/Q4.

**Blocked by:** 01 — Bulk enqueue for 1000 Recipients, 02 — Send Throttle via BullMQ limiter, 03 — Per-Sender hourly limit, 04 — Persistence & idempotency, 05 — Defensive Recipient import + Batch Stagger surfaced, 06 — Auth wiring + ADR 0005

**Status:** ready-for-agent

- [ ] Update `README.md` with: run instructions (Docker Redis appendonly + Postgres, `prisma migrate dev` then `prisma generate`, `npm run dev` on :4000, frontend on :3000), Ethereal setup + env table, architecture overview (scheduling via BullMQ delayed jobs, restart persistence via Redis, rate limiting/concurrency via limiter + per-Sender Redis), feature checklist mapped to brief §8
- [ ] Single disclosures section covering all five locked trade-offs: JWT-in-localStorage + URL (Q6/07), UUID-over-autoincrement for bulk idempotency (Q4/01), Redis-wipe stranded `scheduled` rows (Q1/04), global-env-per-Sender limit not per-request (Q2/03), limiter-vs-concurrency decoupling (Q3/02)
- [ ] Fold in `CONTEXT.md: Sent Emails` note explicitly — `Sent` = `status ∈ {sent, failed}`, tab label stays `Sent` to match Figma, displayed "sent time" for a failed row is `updatedAt` — so it is not lost as an implicit assumption
- [ ] Demo script locked: schedule 2-3 emails 2-3 min out → kill backend → restart → show on-time no-duplicates (exercises Q1/04) + brief rate-limit-under-load clip (not optional, proves Q3 limiter + Q4 bulk work) + dashboard Scheduled/Sent tabs
- [ ] No new ADR (process lock); gated by `Definition of Done` + brief §15.4 "note on assumptions, shortcuts, or trade-offs anywhere"
