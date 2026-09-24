# 03 — Per-Sender hourly limit (env-only, moveToDelayed, never drop)

**What to build:** Each Sender owns a Redis counter `rate:<Sender>:<hour>` via `INCR`/`EXPIRE 3600` against the single global env `MAX_EMAILS_PER_HOUR` (default 50); on breach the job is rescheduled into the next hour window and never dropped.

**Blocked by:** None — can start immediately (parallel with 01/02)

**Status:** ready-for-agent

- [ ] `rateLimiter/hourly-limiter.ts` keys `rate:<Sender>:<hour>` with `hourWindowKey` + `msUntilNextHour`; `checkAndIncrement` uses `INCR`/`EXPIRE 3600`, returns `allowed = count <= maxPerHour`
- [ ] Worker checks limiter before send; on `!allowed` does `job.moveToDelayed(msUntilNextHour())` and returns
- [ ] `hourlyLimit` per-request field stays removed from `schedule.schema.ts` and `SchedulePayload` (dead field, one limit path); rate limit is global env per-Sender key
- [ ] `rateLimiter/` has zero Express/BullMQ imports (unit-testable alone); adds `CONTEXT.md: Sender` + `docs/adr/0002-rate-limit-scope.md`
- [ ] Demoable: two Senders have independent counters; exceeding cap for one Sender reschedules to next hour, no drop
